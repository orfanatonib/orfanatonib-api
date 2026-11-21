/* eslint-disable @typescript-eslint/require-await -- dublês assíncronos de teste */
import { BadRequestException, Logger } from "@nestjs/common";
import {
  MediaType,
  UploadType,
} from "src/shared/media/media-item/media-item.entity";
import { CreateImageSectionService } from "./create-image-section.service";

const png = (key: string) =>
  ({
    fieldname: key,
    originalname: `${key}.png`,
    mimetype: "image/png",
    size: 8,
    buffer: Buffer.alloc(8),
  }) as Express.Multer.File;
const item = (key: string) => ({
  mediaType: MediaType.IMAGE,
  uploadType: UploadType.UPLOAD,
  isLocalFile: true,
  fieldKey: key,
  originalName: `${key}.png`,
});
const dto = {
  caption: "Visita",
  description: "d",
  public: false,
  mediaItems: [item("a")],
};

function setup() {
  const tx = {
    saveSection: jest.fn(async (data: object) => ({ id: "s1", ...data })),
  };
  const transactions = {
    run: jest.fn(async (work: (t: typeof tx) => Promise<unknown>) => work(tx)),
  };
  const saved = [{ id: "m1", mediaType: MediaType.IMAGE, url: "https://b/a" }];
  const processor = {
    processMediaItemsPolymorphic: jest.fn(async () => saved),
    removeMediaItemsKeepingFiles: jest.fn(async () => ["https://b/a"]),
  };
  const mediaStorage = { deleteAfterCommit: jest.fn(async () => undefined) };
  const repo = { findOne: jest.fn(async () => null) };
  const service = new CreateImageSectionService(
    transactions as never,
    { upload: jest.fn(), delete: jest.fn() } as never,
    processor as never,
    repo as never,
    { sendPhotoUploadedNotification: jest.fn() } as never,
    { findAdminEmails: jest.fn(async () => []) } as never,
    mediaStorage as never,
  );
  return { service, tx, transactions, processor, mediaStorage };
}

beforeEach(() => jest.spyOn(Logger.prototype, "error").mockImplementation());
afterEach(() => jest.restoreAllMocks());

describe("CreateImageSectionService", () => {
  it("feliz: grava a publicação privada, sem galeria, com o autor, e devolve o DTO", async () => {
    const { service, tx, processor } = setup();
    const result = await service.createSection(
      { ...dto, public: true } as never,
      { a: png("a") },
      "u1",
      { notifyAdmins: false },
    );
    expect(tx.saveSection).toHaveBeenCalledWith(
      expect.objectContaining({
        page: null,
        author: { id: "u1" },
        public: true,
      }),
    );
    expect(processor.processMediaItemsPolymorphic).toHaveBeenCalledTimes(1);
    expect(result.id).toBe("s1");
    expect(result.mediaItems).toHaveLength(1);
  });

  it("sem autor: grava author null", async () => {
    const { service, tx } = setup();
    await service.createSection(dto as never, { a: png("a") }, null, {
      notifyAdmins: false,
    });
    expect(tx.saveSection).toHaveBeenCalledWith(
      expect.objectContaining({ author: null }),
    );
  });

  it("[image-section.post.image-sections#validacao] validação: sem mídia → 400 antes de abrir transação", async () => {
    const { service, transactions } = setup();
    await expect(
      service.createSection({ ...dto, mediaItems: [] } as never, {}),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(transactions.run).not.toHaveBeenCalled();
  });

  it("validação: arquivo do fieldKey ausente → 400 antes de abrir transação", async () => {
    const { service, transactions } = setup();
    await expect(
      service.createSection(dto as never, {}),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(transactions.run).not.toHaveBeenCalled();
  });

  it("[image-section.post.image-sections#falha-do-colaborador-sem-efeito-parcial] falha do processador de mídia: 400, e nada é removido (ele compensa sozinho)", async () => {
    const { service, processor, mediaStorage } = setup();
    processor.processMediaItemsPolymorphic.mockRejectedValueOnce(
      new Error("s3"),
    );
    await expect(
      service.createSection(dto as never, { a: png("a") }, "u1"),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(processor.removeMediaItemsKeepingFiles).not.toHaveBeenCalled();
    expect(mediaStorage.deleteAfterCommit).not.toHaveBeenCalled();
  });

  it("[image-section.post.image-sections#rollback-de-transacao] falha da transação DEPOIS de as mídias gravarem: remove as linhas e descarta os objetos", async () => {
    const { service, transactions, processor, mediaStorage } = setup();
    transactions.run.mockImplementationOnce(async (work) => {
      await work({
        saveSection: async (d: object) => ({ id: "s1", ...d }),
      } as never);
      throw new Error("commit");
    });
    await expect(
      service.createSection(dto as never, { a: png("a") }, "u1"),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(processor.removeMediaItemsKeepingFiles).toHaveBeenCalledTimes(1);
    expect(mediaStorage.deleteAfterCommit).toHaveBeenCalledWith([
      "https://b/a",
    ]);
  });

  it("falha do repository ao gravar a publicação: 400 sem tocar na mídia", async () => {
    const { service, tx, processor } = setup();
    tx.saveSection.mockRejectedValueOnce(new Error("db"));
    await expect(
      service.createSection(dto as never, { a: png("a") }, "u1"),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(processor.processMediaItemsPolymorphic).not.toHaveBeenCalled();
  });

  it("falha ao limpar depois do commit que falhou não esconde o 400", async () => {
    const { service, transactions, processor } = setup();
    transactions.run.mockImplementationOnce(async (work) => {
      await work({
        saveSection: async (d: object) => ({ id: "s1", ...d }),
      } as never);
      throw new Error("commit");
    });
    processor.removeMediaItemsKeepingFiles.mockRejectedValueOnce(
      new Error("db fora"),
    );
    await expect(
      service.createSection(dto as never, { a: png("a") }, "u1"),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
