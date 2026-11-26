import { Test } from "@nestjs/testing";
import { RuleException } from "src/common/exceptions";
import { AwsS3Service } from "src/infrastructure/aws/services/aws-s3.service";
import { MediaItemProcessor } from "src/shared/media/media-item-processor";
import { MediaTargetType } from "src/shared/media/media-target-type.enum";
import {
  MediaItemEntity,
  MediaType,
  UploadType,
} from "src/shared/media/media-item/media-item.entity";

import { IdeasSectionMediaService } from "./ideas-section-media.service";
import {
  buildFile,
  buildLinkMediaDto,
  buildMediaEntity,
  buildUploadMediaDto,
} from "../ideas-section.fixtures";

describe("IdeasSectionMediaService", () => {
  let service: IdeasSectionMediaService;
  let processor: Record<string, jest.Mock>;
  let s3: Record<string, jest.Mock>;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        IdeasSectionMediaService,
        {
          provide: MediaItemProcessor,
          useValue: {
            findMediaItemsByTarget: jest.fn().mockResolvedValue([]),
            findManyMediaItemsByTargets: jest.fn().mockResolvedValue([]),
            findMediaItemById: jest.fn().mockResolvedValue(null),
            buildBaseMediaItem: jest.fn(
              (
                item: Partial<MediaItemEntity>,
                targetId: string,
                targetType: string,
              ): MediaItemEntity =>
                Object.assign(new MediaItemEntity(), {
                  ...item,
                  targetId,
                  targetType,
                }),
            ),
            upsertMediaItem: jest.fn(
              (
                id: string | undefined,
                media: MediaItemEntity,
              ): MediaItemEntity => ({
                ...media,
                id: id ?? "novo-id",
              }),
            ),
            deleteMediaItems: jest.fn().mockResolvedValue(undefined),
          },
        },
        {
          provide: AwsS3Service,
          useValue: {
            upload: jest.fn().mockResolvedValue("https://bucket.test/novo.png"),
            delete: jest.fn().mockResolvedValue(undefined),
          },
        },
      ],
    }).compile();

    service = moduleRef.get(IdeasSectionMediaService);
    processor = moduleRef.get(MediaItemProcessor);
    s3 = moduleRef.get(AwsS3Service);
  });

  const seedStored = (entity: MediaItemEntity): void => {
    processor.findMediaItemsByTarget.mockResolvedValue([entity]);
    processor.findMediaItemById.mockResolvedValue(entity);
  };

  describe("falha no meio da lista", () => {
    it("[ideas-section.s3.06] a mídia já regravada volta ao arquivo antigo (que segue no bucket) e o objeto novo é descartado", async () => {
      const antigo = buildMediaEntity({
        id: "m1",
        url: "https://bucket.test/antigo.png",
      });
      seedStored(antigo);
      processor.upsertMediaItem
        .mockImplementationOnce((id: string, media: MediaItemEntity) => ({
          ...media,
          id,
        }))
        .mockRejectedValueOnce(new Error("banco"))
        .mockImplementation((id: string, media: MediaItemEntity) => ({
          ...media,
          id,
        }));

      await expect(
        service.replaceAll(
          "section-id",
          [
            buildUploadMediaDto({ id: "m1" }),
            buildUploadMediaDto({ fieldKey: "b" }),
          ],
          { image_upload: buildFile(), b: buildFile({ fieldname: "b" }) },
        ),
      ).rejects.toThrow("banco");

      expect(processor.upsertMediaItem).toHaveBeenCalledWith(
        "m1",
        expect.objectContaining({ url: "https://bucket.test/antigo.png" }),
      );
      expect(s3.delete).toHaveBeenCalledWith("https://bucket.test/novo.png");
      expect(s3.delete).not.toHaveBeenCalledWith(
        "https://bucket.test/antigo.png",
      );
    });

    it("mídia nova gravada antes da falha é removida (linha) e o upload dela descartado", async () => {
      processor.upsertMediaItem
        .mockImplementationOnce(
          (_id: string | undefined, media: MediaItemEntity) => ({
            ...media,
            id: "nova-1",
          }),
        )
        .mockRejectedValueOnce(new Error("banco"));

      await expect(
        service.replaceAll(
          "section-id",
          [buildLinkMediaDto(), buildLinkMediaDto({ title: "segunda" })],
          {},
        ),
      ).rejects.toThrow("banco");

      expect(processor.deleteMediaItems).toHaveBeenCalledWith(
        [expect.objectContaining({ id: "nova-1" })],
        expect.any(Function),
      );
    });
  });

  describe("rollback que também falha", () => {
    it("não restaurar uma linha ou não desfazer as novas é registrado, e o erro devolvido continua sendo o original", async () => {
      seedStored(
        buildMediaEntity({ id: "m1", url: "https://bucket.test/antigo.png" }),
      );
      processor.upsertMediaItem
        .mockImplementationOnce((id: string, media: MediaItemEntity) => ({
          ...media,
          id,
        }))
        .mockImplementationOnce(
          (_id: string | undefined, media: MediaItemEntity) => ({
            ...media,
            id: "nova",
          }),
        )
        .mockRejectedValueOnce(new Error("banco"))
        .mockRejectedValue("texto solto");
      processor.deleteMediaItems.mockRejectedValue("falhou");

      await expect(
        service.replaceAll(
          "section-id",
          [
            buildLinkMediaDto({ id: "m1" }),
            buildLinkMediaDto({ title: "nova" }),
            buildLinkMediaDto({ title: "falha" }),
          ],
          {},
        ),
      ).rejects.toThrow("banco");

      expect(processor.deleteMediaItems).toHaveBeenCalled();
    });
  });

  describe("rollback com erros do tipo Error", () => {
    it("registra o motivo e usa a função de descarte vazia para as linhas novas", async () => {
      processor.upsertMediaItem
        .mockImplementationOnce(
          (_id: string | undefined, media: MediaItemEntity) => ({
            ...media,
            id: "nova",
          }),
        )
        .mockRejectedValueOnce(new Error("banco"));
      processor.deleteMediaItems.mockImplementation(
        async (
          _items: MediaItemEntity[],
          discard: (url: string) => Promise<void>,
        ) => {
          await discard("https://bucket.test/x.png");
          throw new Error("limpeza falhou");
        },
      );

      await expect(
        service.replaceAll(
          "section-id",
          [buildLinkMediaDto(), buildLinkMediaDto({ title: "falha" })],
          {},
        ),
      ).rejects.toThrow("banco");
      expect(s3.delete).not.toHaveBeenCalledWith("https://bucket.test/x.png");
    });

    it("não restaurar a linha antiga por erro do tipo Error também só é registrado", async () => {
      seedStored(buildMediaEntity({ id: "m1" }));
      processor.upsertMediaItem
        .mockImplementationOnce((id: string, media: MediaItemEntity) => ({
          ...media,
          id,
        }))
        .mockRejectedValueOnce(new Error("banco"))
        .mockRejectedValueOnce(new Error("restauração"));

      await expect(
        service.replaceAll(
          "section-id",
          [
            buildLinkMediaDto({ id: "m1" }),
            buildLinkMediaDto({ title: "falha" }),
          ],
          {},
        ),
      ).rejects.toThrow("banco");
    });
  });

  describe("ramos de borda", () => {
    it("mídia sem título usa o título padrão nas mensagens de recusa", async () => {
      expect(() =>
        service.assertUploadsResolvable(
          [buildUploadMediaDto({ title: undefined, fieldKey: undefined })],
          {},
        ),
      ).toThrow(/Sem título/);

      await expect(
        service.replaceAll(
          "section-id",
          [buildLinkMediaDto({ id: "alheia", title: undefined })],
          {},
        ),
      ).rejects.toThrow(/Sem título/);
    });

    it("link sem url grava url vazia, sem quebrar", async () => {
      const [saved] = await service.replaceAll(
        "section-id",
        [buildLinkMediaDto({ url: undefined })],
        {},
      );
      expect(saved.url).toBe("");
    });

    it("apagar o antigo com rejeição que não é Error é só registrado", async () => {
      seedStored(
        buildMediaEntity({ id: "m1", url: "https://bucket.test/antigo.png" }),
      );
      s3.delete.mockRejectedValue("negado");
      await expect(
        service.replaceAll("section-id", [buildUploadMediaDto({ id: "m1" })], {
          image_upload: buildFile(),
        }),
      ).resolves.toHaveLength(1);
    });
  });

  describe("edições simultâneas", () => {
    it("[ideas-section.s3.12] duas escritas da mesma seção rodam em fila: a segunda só começa depois da primeira", async () => {
      const order: string[] = [];
      let releaseFirst: () => void = () => undefined;
      processor.findMediaItemsByTarget
        .mockImplementationOnce(async () => {
          order.push("1:lê");
          await new Promise<void>((resolve) => {
            releaseFirst = resolve;
          });
          order.push("1:fim");
          return [];
        })
        .mockImplementationOnce(() => {
          order.push("2:lê");
          return Promise.resolve([]);
        });

      const first = service.replaceAll("section-id", [], {});
      const second = service.replaceAll("section-id", [], {});
      await new Promise((resolve) => setImmediate(resolve));
      expect(order).toEqual(["1:lê"]);

      releaseFirst();
      await Promise.all([first, second]);
      expect(order).toEqual(["1:lê", "1:fim", "2:lê"]);
    });

    it("a falha da primeira não trava a fila da seção", async () => {
      processor.findMediaItemsByTarget.mockRejectedValueOnce(
        new Error("banco"),
      );
      await expect(service.replaceAll("section-id", [], {})).rejects.toThrow(
        "banco",
      );
      await expect(service.replaceAll("section-id", [], {})).resolves.toEqual(
        [],
      );
    });

    it("seções diferentes não esperam uma pela outra", async () => {
      let releaseA: () => void = () => undefined;
      processor.findMediaItemsByTarget.mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            releaseA = () => resolve([]);
          }),
      );
      const a = service.replaceAll("a", [], {});
      await expect(service.replaceAll("b", [], {})).resolves.toEqual([]);
      releaseA();
      await a;
    });
  });

  describe("falha ao apagar do bucket", () => {
    it("[ideas-section.s3.11] se apagar o objeto antigo falha, a troca já gravada vale, o erro não derruba a requisição e o objeto novo é mantido", async () => {
      // A fila `media_cleanup_queue` é alimentada pelo AwsS3Service (spec próprio);
      // aqui se prova que a ideia não engole nem propaga a falha. Derrubar o
      // LocalStack de verdade fica fora do alcance do E2E (banco só leitura).
      seedStored(
        buildMediaEntity({
          id: "media-id",
          url: "https://bucket.test/antigo.png",
        }),
      );
      s3.delete.mockRejectedValue(new Error("AccessDenied"));

      const [saved] = await service.replaceAll(
        "section-id",
        [buildUploadMediaDto({ id: "media-id" })],
        { image_upload: buildFile() },
      );

      expect(s3.delete).toHaveBeenCalledWith("https://bucket.test/antigo.png");
      expect(saved.url).toBe("https://bucket.test/novo.png");
      expect(processor.upsertMediaItem).toHaveBeenCalled();
    });
  });

  describe("mídia de outra seção", () => {
    it("recusa um id de mídia que não pertence à seção, sem gravar nem enviar nada", async () => {
      processor.findMediaItemsByTarget.mockResolvedValue([
        buildMediaEntity({ id: "minha" }),
      ]);

      await expect(
        service.replaceAll(
          "section-id",
          [buildLinkMediaDto({ id: "de-outra-secao" })],
          {},
        ),
      ).rejects.toThrow(RuleException);

      expect(processor.upsertMediaItem).not.toHaveBeenCalled();
      expect(s3.upload).not.toHaveBeenCalled();
      expect(s3.delete).not.toHaveBeenCalled();
    });
  });

  describe("colunas obrigatórias do banco", () => {
    it("preenche title e description quando o payload os omite", async () => {
      // `media_items.title` e `.description` são NOT NULL sem default: sem
      // isto o insert falhava e derrubava a criação inteira da seção.
      const [saved] = await service.replaceAll(
        "section-id",
        [buildLinkMediaDto({ title: undefined, description: undefined })],
        {},
      );

      expect(saved.title).toBe("Sem título");
      expect(saved.description).toBe("");
    });

    it("preserva o texto que veio no payload", async () => {
      const [saved] = await service.replaceAll(
        "section-id",
        [buildLinkMediaDto({ title: "Vídeo", description: "Explicação" })],
        {},
      );

      expect(saved.title).toBe("Vídeo");
      expect(saved.description).toBe("Explicação");
    });
  });

  describe("link", () => {
    it("grava a url sem tocar no bucket", async () => {
      const [saved] = await service.replaceAll(
        "section-id",
        [buildLinkMediaDto({ url: "  https://youtu.be/abc  " })],
        {},
      );

      expect(saved.url).toBe("https://youtu.be/abc");
      expect(saved.isLocalFile).toBe(false);
      expect(s3.upload).not.toHaveBeenCalled();
    });

    it("converte o tipo do módulo para o da tabela compartilhada", async () => {
      const [saved] = await service.replaceAll(
        "section-id",
        [buildLinkMediaDto()],
        {},
      );

      expect(saved.mediaType).toBe(MediaType.VIDEO);
      expect(saved.targetType).toBe(MediaTargetType.IdeasSection);
    });
  });

  describe("upload", () => {
    it("sobe o arquivo e marca a mídia como local", async () => {
      const [saved] = await service.replaceAll(
        "section-id",
        [buildUploadMediaDto()],
        { image_upload: buildFile() },
      );

      expect(s3.upload).toHaveBeenCalledTimes(1);
      expect(saved.url).toBe("https://bucket.test/novo.png");
      expect(saved.isLocalFile).toBe(true);
      expect(saved.originalName).toBe("foto.png");
      expect(saved.size).toBe(1024);
    });

    it("é local mesmo quando o payload diz que não", async () => {
      // O arquivo passou a morar no nosso bucket; se ficasse marcado como
      // externo, a limpeza na exclusão o deixaria para trás.
      const [saved] = await service.replaceAll(
        "section-id",
        [buildUploadMediaDto({ isLocalFile: false })],
        { image_upload: buildFile() },
      );

      expect(saved.isLocalFile).toBe(true);
    });

    it("recusa upload sem fieldKey", async () => {
      await expect(
        service.replaceAll(
          "section-id",
          [buildUploadMediaDto({ fieldKey: undefined })],
          {},
        ),
      ).rejects.toThrow(RuleException);
    });

    it("recusa upload cujo arquivo não veio", async () => {
      await expect(
        service.replaceAll("section-id", [buildUploadMediaDto()], {}),
      ).rejects.toThrow(RuleException);
    });

    it("troca o arquivo e apaga o anterior do bucket", async () => {
      seedStored(
        buildMediaEntity({
          id: "media-id",
          url: "https://bucket.test/antigo.png",
        }),
      );

      await service.replaceAll(
        "section-id",
        [buildUploadMediaDto({ id: "media-id" })],
        { image_upload: buildFile() },
      );

      expect(s3.delete).toHaveBeenCalledWith("https://bucket.test/antigo.png");
    });

    it("mantém o arquivo quando o item existe e nenhum novo foi enviado", async () => {
      seedStored(
        buildMediaEntity({
          id: "media-id",
          url: "https://bucket.test/antigo.png",
          size: 99,
        }),
      );

      const [saved] = await service.replaceAll(
        "section-id",
        [buildUploadMediaDto({ id: "media-id", title: "Novo título" })],
        {},
      );

      expect(saved.url).toBe("https://bucket.test/antigo.png");
      expect(saved.size).toBe(99);
      expect(saved.title).toBe("Novo título");
      expect(s3.upload).not.toHaveBeenCalled();
      expect(s3.delete).not.toHaveBeenCalled();
    });

    it("apaga o arquivo quando a mídia vira link", async () => {
      seedStored(
        buildMediaEntity({
          id: "media-id",
          url: "https://bucket.test/antigo.png",
        }),
      );

      const [saved] = await service.replaceAll(
        "section-id",
        [buildLinkMediaDto({ id: "media-id" })],
        {},
      );

      expect(s3.delete).toHaveBeenCalledWith("https://bucket.test/antigo.png");
      expect(saved.isLocalFile).toBe(false);
    });
  });

  describe("a lista enviada é a verdade", () => {
    it("remove o que está gravado e não veio mais", async () => {
      processor.findMediaItemsByTarget.mockResolvedValue([
        buildMediaEntity({ id: "fica" }),
        buildMediaEntity({ id: "sai" }),
      ]);

      await service.replaceAll(
        "section-id",
        [buildLinkMediaDto({ id: "fica" })],
        {},
      );

      const [removed] = processor.deleteMediaItems.mock.calls[0] as [
        MediaItemEntity[],
      ];
      expect(removed.map((media) => media.id)).toEqual(["sai"]);
    });

    it("não remove nada quando a lista repete tudo", async () => {
      processor.findMediaItemsByTarget.mockResolvedValue([
        buildMediaEntity({ id: "fica" }),
      ]);

      await service.replaceAll(
        "section-id",
        [buildLinkMediaDto({ id: "fica" })],
        {},
      );

      expect(processor.deleteMediaItems).not.toHaveBeenCalled();
    });

    it("lista vazia remove tudo o que havia", async () => {
      processor.findMediaItemsByTarget.mockResolvedValue([
        buildMediaEntity({ id: "m1" }),
        buildMediaEntity({ id: "m2" }),
      ]);

      const saved = await service.replaceAll("section-id", [], {});

      expect(saved).toEqual([]);
      const [removed] = processor.deleteMediaItems.mock.calls[0] as [
        MediaItemEntity[],
      ];
      expect(removed).toHaveLength(2);
    });
  });

  describe("validação antecipada dos uploads", () => {
    it("aponta o upload sem fieldKey antes de gravar nada", () => {
      expect(() =>
        service.assertUploadsResolvable(
          [buildUploadMediaDto({ fieldKey: undefined, title: "Foto" })],
          {},
        ),
      ).toThrow(/fieldKey ausente para a mídia "Foto"/);
    });

    it("aponta o upload cujo arquivo não veio", () => {
      expect(() =>
        service.assertUploadsResolvable([buildUploadMediaDto()], {}),
      ).toThrow(/Arquivo ausente/);
    });

    it("aceita upload com arquivo", () => {
      expect(() =>
        service.assertUploadsResolvable([buildUploadMediaDto()], {
          image_upload: buildFile(),
        }),
      ).not.toThrow();
    });

    it("ignora link e mídia já gravada", () => {
      // Um item com `id` pode não reenviar o arquivo: a API mantém o do bucket.
      expect(() =>
        service.assertUploadsResolvable(
          [
            buildLinkMediaDto(),
            buildUploadMediaDto({ id: "media-id", fieldKey: undefined }),
          ],
          {},
        ),
      ).not.toThrow();
    });
  });

  describe("consultas", () => {
    it("busca as mídias de várias seções numa chamada só", async () => {
      await service.findBySections(["s1", "s2", "s3"]);

      expect(processor.findManyMediaItemsByTargets).toHaveBeenCalledTimes(1);
      expect(processor.findManyMediaItemsByTargets).toHaveBeenCalledWith(
        ["s1", "s2", "s3"],
        MediaTargetType.IdeasSection,
      );
    });

    it("não consulta nada sem seção alguma", async () => {
      expect(await service.findBySections([])).toEqual([]);
      expect(processor.findManyMediaItemsByTargets).not.toHaveBeenCalled();
    });

    it("removeAll não chama o banco quando não há mídia", async () => {
      await service.removeAll("section-id");

      expect(processor.deleteMediaItems).not.toHaveBeenCalled();
    });

    it("removeAll apaga tudo, inclusive os arquivos", async () => {
      processor.findMediaItemsByTarget.mockResolvedValue([buildMediaEntity()]);

      await service.removeAll("section-id");

      const [items, deleteFn] = processor.deleteMediaItems.mock.calls[0] as [
        MediaItemEntity[],
        (url: string) => Promise<void>,
      ];
      expect(items).toHaveLength(1);
      await deleteFn("https://bucket.test/foto.png");
      expect(s3.delete).toHaveBeenCalledWith("https://bucket.test/foto.png");
    });
  });

  it("uploadType 'link' com isLocalFile true ainda é upload", async () => {
    // O formulário marca o upload das duas formas; as duas precisam valer.
    await service.replaceAll(
      "section-id",
      [
        buildUploadMediaDto({
          uploadType: UploadType.LINK,
          isLocalFile: true,
        }),
      ],
      { image_upload: buildFile() },
    );

    expect(s3.upload).toHaveBeenCalledTimes(1);
  });
});
