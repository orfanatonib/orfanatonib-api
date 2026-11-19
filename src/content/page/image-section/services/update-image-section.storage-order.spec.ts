import { BadRequestException, Logger } from "@nestjs/common";

import { UploadType } from "src/shared/media/media-item/media-item.entity";
import { UpdateImageSectionService } from "./update-image-section.service";

beforeEach(() => {
  jest.spyOn(Logger.prototype, "error").mockImplementation();
  jest.spyOn(Logger.prototype, "warn").mockImplementation();
});
afterEach(() => jest.restoreAllMocks());

const OLD = "https://b/old.png";
const NEW = "https://b/new.png";
const file = {
  fieldname: "f",
  originalname: "n.png",
  mimetype: "image/png",
  size: 3,
  buffer: Buffer.alloc(3),
} as Express.Multer.File;

function setup() {
  const events: string[] = [];
  const existingRow = {
    id: "m1",
    mediaType: "image",
    isLocalFile: true,
    url: OLD,
    originalName: "o.png",
    size: 1,
  };
  const runner = {
    connect: jest.fn(),
    startTransaction: jest.fn(),
    commitTransaction: jest.fn(async () => {
      events.push("commit");
    }),
    rollbackTransaction: jest.fn(async () => {
      events.push("rollback");
    }),
    release: jest.fn(),
    manager: {
      findOneBy: jest.fn().mockResolvedValue(existingRow),
      save: jest.fn(async (section: object) => section),
    },
  };
  const s3 = {
    upload: jest.fn(async () => {
      events.push("upload");
      return NEW;
    }),
    delete: jest.fn(async (url: string) => {
      events.push(`delete:${url}`);
    }),
  };
  const processor = {
    findManyMediaItemsByTargets: jest
      .fn()
      .mockResolvedValue([
        existingRow,
        { id: "gone", isLocalFile: true, url: "https://b/gone.png" },
      ]),
    buildBaseMediaItem: jest.fn((input: object) => ({ ...input })),
    upsertMediaItem: jest.fn(async (_id: string, media: object) => {
      events.push("upsert");
      return { id: "m1", ...media };
    }),
    saveMediaItem: jest.fn(),
    deleteMediaItems: jest.fn(
      async (
        items: Array<{ url: string }>,
        del: (u: string) => Promise<void>,
      ) => {
        for (const it of items) await del(it.url);
      },
    ),
  };
  const svc = new UpdateImageSectionService(
    { get: () => "page1" } as never,
    { createQueryRunner: () => runner } as never,
    s3 as never,
    processor as never,
    {
      findOne: jest.fn().mockResolvedValue({ id: "s1", caption: "c" }),
    } as never,
    { findOneBy: jest.fn().mockResolvedValue({ id: "page1" }) } as never,
  );
  return { events, runner, s3, processor, svc };
}

const dto = {
  caption: "c",
  description: "d",
  public: false,
  mediaItems: [
    {
      id: "m1",
      mediaType: "image",
      uploadType: UploadType.UPLOAD,
      isLocalFile: true,
      fieldKey: "f",
    },
  ],
} as never;

describe("UpdateImageSectionService — ordem S3 × banco (P0 plano 32)", () => {
  it("feliz: sobe o novo, grava, confirma e SÓ DEPOIS apaga o antigo e o que saiu da lista", async () => {
    const { svc, events } = setup();
    await svc.updateSection("s1", dto, { f: file });
    expect(events.indexOf("upload")).toBeLessThan(events.indexOf("commit"));
    expect(events.indexOf("commit")).toBeLessThan(
      events.indexOf(`delete:${OLD}`),
    );
    expect(events.indexOf("commit")).toBeLessThan(
      events.indexOf("delete:https://b/gone.png"),
    );
  });

  it("falha ao gravar a linha depois do upload: apaga só o NOVO; o antigo continua no bucket", async () => {
    const { svc, processor, s3 } = setup();
    processor.upsertMediaItem.mockRejectedValue(new Error("banco"));
    await expect(
      svc.updateSection("s1", dto, { f: file }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(s3.delete).toHaveBeenCalledWith(NEW);
    expect(s3.delete).not.toHaveBeenCalledWith(OLD);
    expect(s3.delete).not.toHaveBeenCalledWith("https://b/gone.png");
  });

  it("falha na transação depois da troca da linha: a linha já aponta para o novo, então o ANTIGO é que sobra e é apagado", async () => {
    const { svc, runner, s3 } = setup();
    runner.manager.save.mockRejectedValue(new Error("tx"));
    await expect(
      svc.updateSection("s1", dto, { f: file }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(s3.delete).toHaveBeenCalledWith(OLD);
    expect(s3.delete).not.toHaveBeenCalledWith(NEW);
  });

  it("falha do upload: nada é apagado", async () => {
    const { svc, s3 } = setup();
    s3.upload.mockRejectedValue(new Error("s3"));
    await expect(
      svc.updateSection("s1", dto, { f: file }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(s3.delete).not.toHaveBeenCalled();
  });

  it("não apaga o arquivo antigo quando a linha continua apontando para ele", async () => {
    const { svc, s3 } = setup();
    await svc.updateSection("s1", dto, {});
    expect(s3.delete).not.toHaveBeenCalledWith(OLD);
  });
});
