/* eslint-disable @typescript-eslint/require-await -- dublês assíncronos de teste */
import { BadRequestException, Logger, NotFoundException } from "@nestjs/common";
import { UploadType } from "src/shared/media/media-item/media-item.entity";
import { ImageSectionReviewStatus } from "../enums/image-section-review-status.enum";
import { UpdateImageSectionService } from "./update-image-section.service";

beforeEach(() => {
  jest.spyOn(Logger.prototype, "error").mockImplementation();
  jest.spyOn(Logger.prototype, "warn").mockImplementation();
});
afterEach(() => jest.restoreAllMocks());

const OLD = "https://b/old.png";
const NEW = "https://b/new.png";
const GONE = "https://b/gone.png";
const png = {
  fieldname: "f",
  originalname: "n.png",
  mimetype: "image/png",
  size: 3,
  buffer: Buffer.alloc(3),
} as Express.Multer.File;

function setup(
  config: Record<string, string> = { FEED_ORFANATO_PAGE_ID: "page1" },
) {
  const events: string[] = [];
  const existingRow = {
    id: "m1",
    targetId: "s1",
    mediaType: "image",
    isLocalFile: true,
    url: OLD,
    originalName: "o.png",
    size: 1,
  };
  const tx = {
    lockSection: jest.fn(async () => ({ id: "s1" })),
    findSection: jest.fn(
      async () => ({ id: "s1", caption: "c" }) as object | null,
    ),
    saveSection: jest.fn(async (section: object) => {
      events.push("section");
      return section;
    }),
    findMedia: jest.fn(async () => existingRow as object | null),
    saveMedia: jest.fn(async (media: object) => {
      events.push("media");
      return { id: "m1", ...media };
    }),
    removeMedia: jest.fn(async (m: { id: string }) => {
      events.push(`remove:${m.id}`);
    }),
  };
  const transactions = {
    run: jest.fn(async (work: (t: typeof tx) => Promise<unknown>) => {
      try {
        const out = await work(tx);
        events.push("commit");
        return out;
      } catch (error) {
        events.push("rollback");
        throw error;
      }
    }),
  };
  const s3 = {
    upload: jest.fn(async () => {
      events.push("upload");
      return NEW;
    }),
  };
  const mediaStorage = {
    deleteAfterCommit: jest.fn(async (urls: string[]) => {
      for (const url of urls) events.push(`delete:${url}`);
    }),
  };
  const processor = {
    findManyMediaItemsByTargets: jest.fn(async () => [existingRow]),
    findMediaItemsByTarget: jest.fn(async () => [
      existingRow,
      { id: "gone", isLocalFile: true, url: GONE },
    ]),
    buildBaseMediaItem: jest.fn((input: object) => ({ ...input })),
  };
  const pageRepo = {
    findOneBy: jest.fn(async () => ({ id: "page1" }) as object | null),
  };
  const svc = new UpdateImageSectionService(
    { get: (key: string) => config[key] } as never,
    transactions as never,
    s3 as never,
    processor as never,
    pageRepo as never,
    mediaStorage as never,
  );
  return { events, tx, s3, mediaStorage, pageRepo, processor, svc };
}

const dto = (extra: object = {}) =>
  ({
    caption: "c",
    description: "d",
    public: true,
    mediaItems: [
      {
        id: "m1",
        mediaType: "image",
        uploadType: UploadType.UPLOAD,
        isLocalFile: true,
        fieldKey: "f",
      },
    ],
    ...extra,
  }) as never;

describe("UpdateImageSectionService", () => {
  it("feliz: sobe o novo, grava tudo, confirma e SÓ DEPOIS apaga o antigo e o que saiu da lista", async () => {
    const { svc, events } = setup();
    const result = await svc.updateSection("s1", dto(), { f: png }, "adm");
    expect(events.indexOf("upload")).toBeLessThan(events.indexOf("commit"));
    expect(events.indexOf("commit")).toBeLessThan(
      events.indexOf(`delete:${OLD}`),
    );
    expect(events.indexOf("commit")).toBeLessThan(
      events.indexOf(`delete:${GONE}`),
    );
    expect(events).toContain("remove:gone");
    expect(result.reviewStatus).toBe(ImageSectionReviewStatus.APPROVED);
  });

  it("aprova: anexa à galeria do feed (config), registra o revisor e limpa o motivo", async () => {
    const { svc, tx, pageRepo } = setup();
    await svc.updateSection("s1", dto(), { f: png }, "adm");
    expect(pageRepo.findOneBy).toHaveBeenCalledWith({ id: "page1" });
    expect(tx.saveSection).toHaveBeenCalledWith(
      expect.objectContaining({
        page: { id: "page1" },
        reviewStatus: ImageSectionReviewStatus.APPROVED,
        rejectionReason: null,
        reviewedBy: { id: "adm" },
      }),
    );
  });

  it("pageId do corpo tem precedência sobre a galeria do feed", async () => {
    const { svc, pageRepo } = setup();
    await svc.updateSection("s1", dto({ pageId: "outra" }), {});
    expect(pageRepo.findOneBy).toHaveBeenCalledWith({ id: "outra" });
  });

  it("sem galeria configurada nem pageId: 404 sem gravar (não casa com qualquer galeria)", async () => {
    const { svc, pageRepo, tx } = setup({});
    await expect(svc.updateSection("s1", dto(), {})).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(pageRepo.findOneBy).not.toHaveBeenCalled();
    expect(tx.saveSection).not.toHaveBeenCalled();
  });

  it("[image-section.patch.image-sections-id#nao-encontrado] publicação inexistente: 404 e nada é apagado", async () => {
    const { svc, tx, mediaStorage } = setup();
    tx.findSection.mockResolvedValueOnce(null);
    await expect(svc.updateSection("x", dto(), {})).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(mediaStorage.deleteAfterCommit).toHaveBeenCalledWith([]);
    expect(tx.saveMedia).not.toHaveBeenCalled();
  });

  it("mídia de OUTRA publicação (id alheio): 404, nada gravado", async () => {
    const { svc, tx } = setup();
    tx.findMedia.mockResolvedValueOnce({
      id: "m1",
      targetId: "outra",
      url: OLD,
    });
    await expect(
      svc.updateSection("s1", dto(), { f: png }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(tx.saveMedia).not.toHaveBeenCalled();
  });

  it("[image-section.patch.image-sections-id#validacao] validação: sem mídia → 400 antes de abrir a transação", async () => {
    const { svc } = setup();
    await expect(
      svc.updateSection("s1", dto({ mediaItems: [] }), {}),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("[image-section.patch.image-sections-id#falha-do-colaborador-sem-efeito-parcial] falha ao gravar a linha depois do upload: rollback, descarta só o NOVO; antigo e removidos seguem no bucket", async () => {
    const { svc, tx, events, mediaStorage } = setup();
    tx.saveMedia.mockRejectedValueOnce(new Error("banco"));
    await expect(
      svc.updateSection("s1", dto(), { f: png }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(events).toContain("rollback");
    expect(mediaStorage.deleteAfterCommit).toHaveBeenCalledWith([NEW]);
    expect(events).not.toContain(`delete:${OLD}`);
    expect(events).not.toContain(`delete:${GONE}`);
  });

  it("[image-section.patch.image-sections-id#rollback-de-transacao] falha ao salvar a publicação (depois das mídias): rollback e o objeto novo é descartado", async () => {
    const { svc, tx, events } = setup();
    tx.saveSection.mockRejectedValueOnce(new Error("tx"));
    await expect(
      svc.updateSection("s1", dto(), { f: png }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(events).toContain("rollback");
    expect(events).toContain(`delete:${NEW}`);
    expect(events).not.toContain(`delete:${OLD}`);
  });

  it("falha do upload: nada novo para descartar e nada antigo apagado", async () => {
    const { svc, s3, events } = setup();
    s3.upload.mockRejectedValueOnce(new Error("s3"));
    await expect(
      svc.updateSection("s1", dto(), { f: png }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(events.some((e) => e.startsWith("delete:"))).toBe(false);
  });

  it("sem arquivo novo: a linha continua apontando para o objeto antigo, que NÃO é apagado", async () => {
    const { svc, events } = setup();
    await svc.updateSection("s1", dto(), {});
    expect(events).not.toContain(`delete:${OLD}`);
    expect(events).toContain(`delete:${GONE}`);
  });

  it("mídia nova sem id sobe e grava; link de foto externo não vai ao bucket", async () => {
    const { svc, s3, tx } = setup();
    await svc.updateSection(
      "s1",
      dto({
        mediaItems: [
          {
            mediaType: "image",
            uploadType: UploadType.UPLOAD,
            isLocalFile: true,
            fieldKey: "f",
          },
          {
            mediaType: "image",
            uploadType: UploadType.LINK,
            isLocalFile: false,
            url: " https://youtu.be/x ",
          },
        ],
      }),
      { f: png },
    );
    expect(s3.upload).toHaveBeenCalledTimes(1);
    expect(tx.saveMedia).toHaveBeenCalledTimes(2);
    expect(tx.saveMedia).toHaveBeenLastCalledWith(
      expect.objectContaining({
        url: "https://youtu.be/x",
        isLocalFile: false,
      }),
    );
  });

  it("trava a publicação antes de ler (edições simultâneas se enfileiram)", async () => {
    const { svc, tx } = setup();
    await svc.updateSection("s1", dto(), {});
    expect(tx.lockSection.mock.invocationCallOrder[0]).toBeLessThan(
      tx.findSection.mock.invocationCallOrder[0],
    );
  });
});
