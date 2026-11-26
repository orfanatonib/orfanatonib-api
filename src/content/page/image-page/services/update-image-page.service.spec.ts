/* eslint-disable @typescript-eslint/require-await, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call -- dublês assíncronos de teste */
import { BadRequestException, Logger, NotFoundException } from "@nestjs/common";
import { UpdateImagePageService } from "./update-image-page.service";
import { UpdateImagePageMediaService } from "./update-image-page-media.service";
import { ImageSectionReviewStatus } from "src/content/page/image-section/enums/image-section-review-status.enum";
import { MediaChangeLog } from "../media-change-log";

const SECTION = { id: "s1" };
const OLD_MEDIA = {
  id: "m1",
  url: "https://b/old.png",
  isLocalFile: true,
  originalName: "old.png",
  size: 1,
};

function setup() {
  let uploads = 0;
  const tx = {
    manager: {},
    lockPage: jest.fn(async () => true),
    savePage: jest.fn(async (x: object) => ({ id: "p1", ...x })),
    saveSection: jest.fn(async (x: { id?: string }) => ({
      id: x.id ?? "s-new",
      ...x,
    })),
    removeSection: jest.fn(),
    removeMedia: jest.fn(),
    findMedia: jest.fn(async () => OLD_MEDIA),
    saveMedia: jest.fn(async (x: object) => ({ id: "m-saved", ...x })),
  };
  const transactions = {
    run: jest.fn(async (work: (t: typeof tx) => Promise<unknown>) => work(tx)),
  };
  const pages = {
    findByIdWithSections: jest.fn().mockResolvedValue({ id: "p1" }),
  };
  const sections = { findByPageId: jest.fn().mockResolvedValue([SECTION]) };
  const routes = {
    findRouteByEntityId: jest.fn().mockResolvedValue({ id: "r1" }),
    upsertRoute: jest.fn().mockResolvedValue({ id: "r1" }),
  };
  const s3 = {
    upload: jest.fn(async () => `https://b/new${++uploads}.png`),
    delete: jest.fn().mockResolvedValue(undefined),
  };
  const processor = {
    findManyMediaItemsByTargets: jest.fn().mockResolvedValue([OLD_MEDIA]),
    buildBaseMediaItem: jest.fn((item: object) => ({ ...item })),
    discardUnreferencedUploads: jest.fn().mockResolvedValue(undefined),
  };
  const storage = { deleteAfterCommit: jest.fn().mockResolvedValue(undefined) };
  const mediaService = new UpdateImagePageMediaService(
    s3 as never,
    processor as never,
  );
  const svc = new UpdateImagePageService(
    transactions as never,
    pages as never,
    sections as never,
    routes as never,
    s3 as never,
    processor as never,
    storage as never,
    mediaService,
  );
  return {
    svc,
    tx,
    transactions,
    pages,
    sections,
    routes,
    s3,
    processor,
    storage,
  };
}

const dto = (mediaItems: object[], sectionId: string | undefined = "s1") =>
  ({
    id: "p1",
    title: "Novo",
    description: "d",
    public: true,
    sections: [
      {
        id: sectionId,
        caption: "c",
        description: "d",
        public: true,
        mediaItems,
      },
    ],
  }) as never;

const replaceFile = {
  id: "m1",
  uploadType: "upload",
  isLocalFile: true,
  fieldKey: "f1",
  mediaType: "image",
};
const files = {
  f1: { originalname: "n.png", size: 5 } as Express.Multer.File,
};

describe("UpdateImagePageService", () => {
  beforeEach(() => {
    jest.spyOn(Logger.prototype, "error").mockImplementation();
  });
  afterEach(() => jest.restoreAllMocks());

  it("atualização parcial: título/visibilidade mudam, rota é atualizada, mídia mantida", async () => {
    const { svc, tx, routes, storage } = setup();
    const result = await svc.updateImagePage(
      "p1",
      dto([{ id: "m1", uploadType: "upload", isLocalFile: true }]),
      {},
    );
    expect(tx.savePage).toHaveBeenCalledWith(
      expect.objectContaining({ id: "p1", name: "Novo", public: true }),
    );
    expect(routes.upsertRoute).toHaveBeenCalledWith(
      "r1",
      expect.objectContaining({ title: "Novo", entityId: "p1" }),
    );
    expect(tx.removeMedia).not.toHaveBeenCalled();
    expect(storage.deleteAfterCommit).toHaveBeenCalledWith([]);
    expect(result.id).toBe("p1");
  });

  it.each([
    [
      "galeria",
      (s: ReturnType<typeof setup>) =>
        s.pages.findByIdWithSections.mockResolvedValue(null),
    ],
    [
      "seções",
      (s: ReturnType<typeof setup>) =>
        s.sections.findByPageId.mockResolvedValue([]),
    ],
    [
      "rota",
      (s: ReturnType<typeof setup>) =>
        s.routes.findRouteByEntityId.mockResolvedValue(null),
    ],
    [
      "mídia",
      (s: ReturnType<typeof setup>) =>
        s.processor.findManyMediaItemsByTargets.mockResolvedValue([]),
    ],
  ])(
    "%s inexistente: 404 padronizado, nada gravado nem apagado",
    async (_n, arrange) => {
      const ctx = setup();
      arrange(ctx);
      await expect(
        ctx.svc.updateImagePage("p1", dto([]), {}),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(ctx.tx.savePage).not.toHaveBeenCalled();
      expect(ctx.storage.deleteAfterCommit).not.toHaveBeenCalled();
    },
  );

  it("os validadores públicos devolvem 404 específico", async () => {
    const { svc, pages } = setup();
    pages.findByIdWithSections.mockResolvedValue(null);
    await expect(svc.validateImagePage("x")).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it("substituir arquivo: novo sobe, o antigo só é apagado DEPOIS do commit", async () => {
    const { svc, s3, storage, transactions } = setup();
    let committed = false;
    transactions.run.mockImplementationOnce(async (work) => {
      const out = await work({
        manager: {},
        lockPage: jest.fn(async () => true),
        savePage: jest.fn(async (x: object) => ({ id: "p1", ...x })),
        saveSection: jest.fn(async (x: object) => ({ ...x })),
        removeMedia: jest.fn(),
        findMedia: jest.fn(async () => OLD_MEDIA),
        saveMedia: jest.fn(async (x: object) => ({ ...x })),
      } as never);
      expect(storage.deleteAfterCommit).not.toHaveBeenCalled();
      committed = true;
      return out;
    });
    await svc.updateImagePage("p1", dto([replaceFile]), files);
    expect(committed).toBe(true);
    expect(s3.upload).toHaveBeenCalledTimes(1);
    expect(storage.deleteAfterCommit).toHaveBeenCalledWith([OLD_MEDIA.url]);
    expect(s3.delete).not.toHaveBeenCalled();
  });

  it("remover item de mídia: linha removida na transação e objeto na limpeza pós-commit", async () => {
    const { svc, tx, storage } = setup();
    await svc.updateImagePage("p1", dto([]), {});
    expect(tx.removeMedia).toHaveBeenCalledWith(OLD_MEDIA);
    expect(storage.deleteAfterCommit).toHaveBeenCalledWith([OLD_MEDIA.url]);
  });

  it("seção removida: a seção e a mídia dela saem", async () => {
    const { svc, tx, sections, storage } = setup();
    sections.findByPageId.mockResolvedValue([SECTION, { id: "s2" }]);
    await svc.updateImagePage(
      "p1",
      dto([{ id: "m1", uploadType: "upload", isLocalFile: true }]),
      {},
    );
    expect(tx.removeSection).toHaveBeenCalledWith({ id: "s2" });
    expect(storage.deleteAfterCommit).toHaveBeenCalledWith([]);
  });

  it("[image-page.patch.image-pages-id#rollback-de-transacao] [media-upload.legacy-update.image-page#rollback-transacao] falha no 2º item (rollback): antigos intactos e uploads novos descartados", async () => {
    const { svc, s3, storage, processor, tx } = setup();
    tx.saveMedia
      .mockResolvedValueOnce({ id: "m1" } as never)
      .mockRejectedValueOnce(new Error("db"));
    const second = {
      uploadType: "upload",
      isLocalFile: true,
      fieldKey: "f1",
      mediaType: "image",
    };
    await expect(
      svc.updateImagePage("p1", dto([replaceFile, second]), files),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(storage.deleteAfterCommit).not.toHaveBeenCalled();
    expect(processor.discardUnreferencedUploads).toHaveBeenCalledWith(
      ["https://b/new1.png", "https://b/new2.png"],
      expect.any(Function),
    );
    const deleteFn = processor.discardUnreferencedUploads.mock.calls[0][1];
    await deleteFn("u");
    expect(s3.delete).toHaveBeenCalledWith("u");
  });

  it("[image-page.patch.image-pages-id#falha-do-colaborador-sem-efeito-parcial] falha ao atualizar a rota: 400, uploads descartados e objetos antigos mantidos", async () => {
    const { svc, routes, storage, processor } = setup();
    routes.upsertRoute.mockRejectedValue(new Error("rota"));
    await expect(
      svc.updateImagePage("p1", dto([replaceFile]), files),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(storage.deleteAfterCommit).not.toHaveBeenCalled();
    expect(processor.discardUnreferencedUploads).not.toHaveBeenCalled();
  });

  it("falha ao descartar uploads não troca o erro devolvido", async () => {
    const { svc, processor, tx } = setup();
    tx.saveMedia.mockRejectedValue(new Error("db"));
    processor.discardUnreferencedUploads.mockRejectedValue(new Error("s3"));
    await expect(
      svc.updateImagePage("p1", dto([replaceFile]), files),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("falha sem upload: nada a descartar", async () => {
    const { svc, processor, pages } = setup();
    pages.findByIdWithSections.mockResolvedValue(null);
    await expect(svc.updateImagePage("p1", dto([]), {})).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(processor.discardUnreferencedUploads).not.toHaveBeenCalled();
  });

  it("seção nova nasce aprovada; seção existente não tem o status tocado", async () => {
    const { svc, tx } = setup();
    await svc.updateImagePage(
      "p1",
      dto([{ id: "m1", uploadType: "upload", isLocalFile: true }], ""),
      {},
    );
    expect(tx.saveSection).toHaveBeenCalledWith(
      expect.objectContaining({
        reviewStatus: ImageSectionReviewStatus.APPROVED,
      }),
    );
  });
});

describe("UpdateImagePageMediaService", () => {
  const build = () => {
    const s3 = { upload: jest.fn(async () => "https://b/n.png") };
    const processor = {
      buildBaseMediaItem: jest.fn((i: object) => ({ ...i })),
    };
    const tx = {
      findMedia: jest.fn(async () => OLD_MEDIA),
      saveMedia: jest.fn(async (x: object) => ({ ...x })),
      removeMedia: jest.fn(),
    };
    return {
      svc: new UpdateImagePageMediaService(s3 as never, processor as never),
      s3,
      tx,
    };
  };

  it("novo item de upload sem arquivo: erro e nada gravado", async () => {
    const { svc, tx } = build();
    await expect(
      svc.addMedia(
        { isLocalFile: true, fieldKey: "z" } as never,
        "s1",
        {},
        tx as never,
        new MediaChangeLog(),
      ),
    ).rejects.toThrow("File not found");
    expect(tx.saveMedia).not.toHaveBeenCalled();
  });

  it("novo item de upload sem chave: erro", async () => {
    const { svc, tx } = build();
    await expect(
      svc.addMedia(
        { isLocalFile: true } as never,
        "s1",
        {},
        tx as never,
        new MediaChangeLog(),
      ),
    ).rejects.toThrow("no fieldKey");
  });

  it("novo item link: grava sem tocar o bucket", async () => {
    const { svc, s3, tx } = build();
    const log = new MediaChangeLog();
    await svc.addMedia(
      { isLocalFile: false, url: "https://y" } as never,
      "s1",
      {},
      tx as never,
      log,
    );
    expect(s3.upload).not.toHaveBeenCalled();
    expect(log.uploadedUrls).toEqual([]);
  });

  it("trocar arquivo local por link marca o objeto antigo como obsoleto", async () => {
    const { svc, tx } = build();
    const log = new MediaChangeLog();
    await svc.upsertMedia(
      {
        id: "m1",
        uploadType: "link",
        isLocalFile: false,
        url: " https://y ",
      } as never,
      "s1",
      {},
      tx as never,
      log,
    );
    expect(log.obsoleteUrls).toEqual([OLD_MEDIA.url]);
    expect(tx.saveMedia).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "m1",
        url: "https://y",
        isLocalFile: false,
      }),
    );
  });

  it("upload sem arquivo novo mantém o objeto existente", async () => {
    const { svc, tx } = build();
    const log = new MediaChangeLog();
    await svc.upsertMedia(
      { id: "m1", uploadType: "upload", isLocalFile: true } as never,
      "s1",
      {},
      tx as never,
      log,
    );
    expect(log.obsoleteUrls).toEqual([]);
    expect(tx.saveMedia).toHaveBeenCalledWith(
      expect.objectContaining({ url: OLD_MEDIA.url }),
    );
  });
});

describe("MediaChangeLog", () => {
  it("ignora vazio e não repete obsoleto", () => {
    const log = new MediaChangeLog();
    log.recordObsolete(undefined);
    log.recordObsolete("a");
    log.recordObsolete("a");
    expect(log.obsoleteUrls).toEqual(["a"]);
  });
});
