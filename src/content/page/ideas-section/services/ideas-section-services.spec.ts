import { Test, TestingModule } from "@nestjs/testing";
import {
  ResourceConflictException,
  ResourceNotFoundException,
  RuleException,
} from "src/common/exceptions";

import { AttachIdeasSectionService } from "./attach-ideas-section.service";
import { CreateIdeasSectionService } from "./create-ideas-section.service";
import { DeleteIdeasSectionService } from "./delete-ideas-section.service";
import { GetIdeasSectionService } from "./get-ideas-section.service";
import { IdeasSectionMediaService } from "./ideas-section-media.service";
import { UpdateIdeasSectionService } from "./update-ideas-section.service";
import { IdeasSectionRepository } from "../repositories/ideas-section.repository";
import { CreateIdeasSectionDto } from "../dto/create-ideas-section.dto";
import { IdeasSectionData } from "../types";
import {
  buildLinkMediaDto,
  buildMediaEntity,
  buildPage,
  buildSection,
  buildUser,
} from "../ideas-section.fixtures";

const dtoOf = (
  overrides: Partial<CreateIdeasSectionDto> = {},
): CreateIdeasSectionDto =>
  Object.assign(new CreateIdeasSectionDto(), {
    title: "Ideia",
    description: "Descrição",
    medias: [],
    ...overrides,
  });

describe("serviços de ideias compartilhadas", () => {
  let moduleRef: TestingModule;
  let repository: Record<string, jest.Mock>;
  let mediaService: Record<string, jest.Mock>;

  beforeEach(async () => {
    moduleRef = await Test.createTestingModule({
      providers: [
        CreateIdeasSectionService,
        UpdateIdeasSectionService,
        AttachIdeasSectionService,
        GetIdeasSectionService,
        DeleteIdeasSectionService,
        {
          provide: IdeasSectionRepository,
          useValue: {
            findById: jest.fn(),
            findUnattached: jest.fn(),
            countUnattached: jest.fn(),
            findPageById: jest.fn(),
            createUnattached: jest.fn(),
            updateData: jest.fn(),
            attachToPage: jest.fn(),
            deleteById: jest.fn(),
          },
        },
        {
          provide: IdeasSectionMediaService,
          useValue: {
            assertUploadsResolvable: jest.fn(),
            replaceAll: jest.fn().mockResolvedValue([]),
            removeAll: jest.fn().mockResolvedValue(undefined),
            findBySection: jest.fn().mockResolvedValue([]),
            findBySections: jest.fn().mockResolvedValue([]),
          },
        },
      ],
    }).compile();

    repository = moduleRef.get(IdeasSectionRepository);
    mediaService = moduleRef.get(IdeasSectionMediaService);
  });

  /** Dados da seção na primeira chamada de `createUnattached`. */
  const firstCreateData = (): IdeasSectionData =>
    (repository.createUnattached.mock.calls[0] as [IdeasSectionData])[0];

  describe("criação", () => {
    let service: CreateIdeasSectionService;

    beforeEach(() => {
      service = moduleRef.get(CreateIdeasSectionService);
      repository.createUnattached.mockResolvedValue(buildSection());
      repository.findById.mockResolvedValue(buildSection());
    });

    it("grava a seção sem página, atribuída a quem enviou", async () => {
      await service.execute(dtoOf(), {}, "user-id");

      expect(repository.createUnattached).toHaveBeenCalledWith(
        { title: "Ideia", description: "Descrição", public: false },
        "user-id",
      );
    });

    it("public ausente vale false", async () => {
      await service.execute(dtoOf({ public: undefined }), {}, "user-id");

      expect(firstCreateData().public).toBe(false);
    });

    it("respeita public quando o payload o traz", async () => {
      await service.execute(dtoOf({ public: true }), {}, "user-id");

      expect(firstCreateData().public).toBe(true);
    });

    it("relê a seção para a resposta trazer o autor", async () => {
      // Recém-criada, a seção carrega o autor só como `{ id }` — a resposta
      // saía com `user: { name: "" }`.
      repository.findById.mockResolvedValue(
        buildSection({ user: buildUser({ name: "Ana Paula Souza" }) }),
      );

      const response = await service.execute(dtoOf(), {}, "user-id");

      expect(response.user).toEqual({
        name: "Ana Souza",
        email: "maria@exemplo.test",
        phone: "92999990000",
      });
    });

    it("grava a mídia enviada junto", async () => {
      mediaService.replaceAll.mockResolvedValue([buildMediaEntity()]);

      const response = await service.execute(
        dtoOf({ medias: [buildLinkMediaDto()] }),
        {},
        "user-id",
      );

      expect(mediaService.replaceAll).toHaveBeenCalledWith(
        "section-id",
        [expect.objectContaining({ uploadType: "link" })],
        {},
      );
      expect(response.medias).toHaveLength(1);
    });

    it("recusa upload inválido antes de gravar a seção", async () => {
      mediaService.assertUploadsResolvable.mockImplementation(() => {
        throw new RuleException("Arquivo ausente");
      });

      await expect(
        service.execute(
          dtoOf({ medias: [buildLinkMediaDto()] }),
          {},
          "user-id",
        ),
      ).rejects.toBeInstanceOf(RuleException);
      expect(repository.createUnattached).not.toHaveBeenCalled();
    });

    it("desfaz a seção quando a mídia falha depois de gravá-la", async () => {
      // Sem transação, uma falha no S3 deixava uma ideia vazia no banco.
      mediaService.replaceAll.mockRejectedValue(new Error("S3 fora do ar"));

      await expect(
        service.execute(
          dtoOf({ medias: [buildLinkMediaDto()] }),
          {},
          "user-id",
        ),
      ).rejects.toThrow("S3 fora do ar");
      expect(repository.deleteById).toHaveBeenCalledWith("section-id");
    });

    it("medias ausente não quebra", async () => {
      await service.execute(dtoOf({ medias: undefined }), {}, "user-id");

      expect(mediaService.replaceAll).toHaveBeenCalledWith(
        "section-id",
        [],
        {},
      );
    });
  });

  describe("atualização", () => {
    let service: UpdateIdeasSectionService;

    beforeEach(() => {
      service = moduleRef.get(UpdateIdeasSectionService);
      repository.findById.mockResolvedValue(buildSection());
      repository.updateData.mockResolvedValue(
        buildSection({ title: "Editado" }),
      );
    });

    it("atualiza a seção no lugar, sem criar outra", async () => {
      // O método anterior salvava um objeto sem `id`: cada PATCH inseria uma
      // seção nova, deixava a original órfã e devolvia outro id ao cliente.
      const response = await service.execute(
        "section-id",
        dtoOf({ title: "Editado" }),
        {},
      );

      expect(repository.createUnattached).not.toHaveBeenCalled();
      expect(repository.updateData).toHaveBeenCalledWith("section-id", {
        title: "Editado",
        description: "Descrição",
        public: false,
      });
      expect(response.id).toBe("section-id");
    });

    it("404 quando a seção não existe", async () => {
      repository.findById.mockResolvedValue(null);

      await expect(
        service.execute("sumiu", dtoOf(), {}),
      ).rejects.toBeInstanceOf(ResourceNotFoundException);
      expect(repository.updateData).not.toHaveBeenCalled();
    });

    it("substitui a lista de mídias pela que veio", async () => {
      await service.execute("section-id", dtoOf({ medias: [] }), {});

      expect(mediaService.replaceAll).toHaveBeenCalledWith(
        "section-id",
        [],
        {},
      );
    });
  });

  describe("vinculação a uma página", () => {
    let service: AttachIdeasSectionService;

    beforeEach(() => {
      service = moduleRef.get(AttachIdeasSectionService);
      repository.findById.mockResolvedValue(buildSection());
      repository.findPageById.mockResolvedValue(buildPage());
      repository.attachToPage.mockResolvedValue(
        buildSection({ page: buildPage() }),
      );
    });

    it("vincula a seção à página", async () => {
      await service.execute("section-id", "page-id", dtoOf(), {});

      expect(repository.attachToPage).toHaveBeenCalledWith(
        "section-id",
        { title: "Ideia", description: "Descrição", public: false },
        buildPage(),
      );
    });

    it("404 quando a seção não existe", async () => {
      repository.findById.mockResolvedValue(null);

      await expect(
        service.execute("sumiu", "page-id", dtoOf(), {}),
      ).rejects.toBeInstanceOf(ResourceNotFoundException);
    });

    it("404 quando a página não existe", async () => {
      repository.findPageById.mockResolvedValue(null);

      await expect(
        service.execute("section-id", "sumiu", dtoOf(), {}),
      ).rejects.toBeInstanceOf(ResourceNotFoundException);
      expect(repository.attachToPage).not.toHaveBeenCalled();
    });

    it("409 quando a seção já está numa página", async () => {
      repository.findById.mockResolvedValue(
        buildSection({ page: buildPage() }),
      );

      await expect(
        service.execute("section-id", "page-id", dtoOf(), {}),
      ).rejects.toBeInstanceOf(ResourceConflictException);
    });

    it("a resposta não vaza a página", async () => {
      const response = await service.execute(
        "section-id",
        "page-id",
        dtoOf(),
        {},
      );

      expect(response).not.toHaveProperty("page");
    });
  });

  describe("leitura", () => {
    let service: GetIdeasSectionService;

    beforeEach(() => {
      service = moduleRef.get(GetIdeasSectionService);
    });

    it("404 quando a seção não existe", async () => {
      repository.findById.mockResolvedValue(null);

      await expect(service.findOne("sumiu")).rejects.toBeInstanceOf(
        ResourceNotFoundException,
      );
    });

    it("devolve a seção com as mídias", async () => {
      repository.findById.mockResolvedValue(buildSection());
      mediaService.findBySection.mockResolvedValue([buildMediaEntity()]);

      const response = await service.findOne("section-id");

      expect(response.id).toBe("section-id");
      expect(response.medias).toHaveLength(1);
    });

    it("a listagem busca as mídias de todas as seções numa consulta", async () => {
      repository.findUnattached.mockResolvedValue([
        buildSection({ id: "s1" }),
        buildSection({ id: "s2" }),
      ]);
      mediaService.findBySections.mockResolvedValue([
        buildMediaEntity({ id: "m1", targetId: "s1" }),
        buildMediaEntity({ id: "m2", targetId: "s2" }),
        buildMediaEntity({ id: "m3", targetId: "s1" }),
      ]);

      const response = await service.findUnattached();

      expect(mediaService.findBySections).toHaveBeenCalledTimes(1);
      expect(response.map((item) => item.medias.length)).toEqual([2, 1]);
    });

    it("o selo do painel usa a contagem do repositório", async () => {
      repository.countUnattached.mockResolvedValue(5);

      expect(await service.pendingCount()).toEqual({ pending: 5 });
      expect(mediaService.findBySections).not.toHaveBeenCalled();
    });

    it("sem seção alguma, não consulta mídia", async () => {
      repository.findUnattached.mockResolvedValue([]);

      expect(await service.findUnattached()).toEqual([]);
      expect(mediaService.findBySections).not.toHaveBeenCalled();
    });
  });

  describe("remoção", () => {
    let service: DeleteIdeasSectionService;

    beforeEach(() => {
      service = moduleRef.get(DeleteIdeasSectionService);
    });

    it("apaga a seção e as mídias", async () => {
      repository.findById.mockResolvedValue(buildSection());

      await service.execute("section-id");

      expect(mediaService.removeAll).toHaveBeenCalledWith("section-id");
      expect(repository.deleteById).toHaveBeenCalledWith("section-id");
    });

    it("404 quando a seção não existe", async () => {
      repository.findById.mockResolvedValue(null);

      await expect(service.execute("sumiu")).rejects.toBeInstanceOf(
        ResourceNotFoundException,
      );
    });

    it("recusa apagar seção já publicada numa página", async () => {
      // A regra existia, mas a seção era lida sem a relação `page`: o campo
      // vinha sempre indefinido e a guarda nunca disparava.
      repository.findById.mockResolvedValue(
        buildSection({ page: buildPage() }),
      );

      await expect(service.execute("section-id")).rejects.toBeInstanceOf(
        ResourceConflictException,
      );
      expect(repository.deleteById).not.toHaveBeenCalled();
      expect(mediaService.removeAll).not.toHaveBeenCalled();
    });
  });
});
