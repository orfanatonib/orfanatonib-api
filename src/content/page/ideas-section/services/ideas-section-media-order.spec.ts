import { Logger } from "@nestjs/common";

import { UploadType } from "src/shared/media/media-item/media-item.entity";
import { IdeasSectionMediaService } from "./ideas-section-media.service";

beforeEach(() => {
  jest.spyOn(Logger.prototype, "error").mockImplementation();
});
afterEach(() => jest.restoreAllMocks());

const OLD = "https://b/old.png";
const NEW = "https://b/new.png";
const file = { originalname: "n.png", size: 5 } as Express.Multer.File;

function setup() {
  const events: string[] = [];
  const stored = {
    id: "m1",
    isLocalFile: true,
    url: OLD,
    originalName: "o.png",
    size: 1,
  };
  const processor = {
    findMediaItemsByTarget: jest.fn().mockResolvedValue([stored]),
    findMediaItemById: jest.fn().mockResolvedValue(stored),
    buildBaseMediaItem: jest.fn((input: object) => ({ ...input })),
    upsertMediaItem: jest.fn(async (_id: string | undefined, media: object) => {
      events.push("upsert");
      return { id: "m1", ...media };
    }),
    deleteMediaItems: jest.fn(
      async (
        items: Array<{ url: string }>,
        del: (u: string) => Promise<void>,
      ) => {
        for (const it of items) await del(it.url);
      },
    ),
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
  return {
    events,
    processor,
    s3,
    svc: new IdeasSectionMediaService(processor as never, s3 as never),
  };
}

const replacement = {
  id: "m1",
  title: "t",
  uploadType: UploadType.UPLOAD,
  isLocalFile: true,
  fieldKey: "f",
  mediaType: "image",
} as never;

describe("IdeasSectionMediaService.replaceAll — ordem S3 × banco", () => {
  it("troca de arquivo: sobe o novo, grava a linha e SÓ DEPOIS apaga o antigo", async () => {
    const { svc, events } = setup();
    await svc.replaceAll("s1", [replacement], { f: file });
    expect(events).toEqual(["upload", "upsert", `delete:${OLD}`]);
  });

  it("falha ao gravar a linha depois do upload: apaga o NOVO e preserva o antigo", async () => {
    const { svc, processor, s3 } = setup();
    processor.upsertMediaItem.mockRejectedValue(new Error("banco"));
    await expect(
      svc.replaceAll("s1", [replacement], { f: file }),
    ).rejects.toThrow("banco");
    expect(s3.delete).toHaveBeenCalledWith(NEW);
    expect(s3.delete).not.toHaveBeenCalledWith(OLD);
  });

  it("falha no upload: nada é apagado (o antigo continua referenciado)", async () => {
    const { svc, s3 } = setup();
    s3.upload.mockRejectedValue(new Error("s3"));
    await expect(
      svc.replaceAll("s1", [replacement], { f: file }),
    ).rejects.toThrow("s3");
    expect(s3.delete).not.toHaveBeenCalled();
  });

  it("mídia que saiu da lista só é removida depois que as demais foram gravadas", async () => {
    const { svc, processor, events } = setup();
    processor.findMediaItemsByTarget.mockResolvedValue([
      { id: "gone", isLocalFile: true, url: "https://b/gone.png" },
      { id: "m1", isLocalFile: true, url: OLD },
    ]);
    await svc.replaceAll("s1", [replacement], { f: file });
    expect(events.indexOf("upsert")).toBeLessThan(
      events.indexOf("delete:https://b/gone.png"),
    );
  });

  it("falha ao apagar o antigo não derruba a requisição (já foi gravado)", async () => {
    const { svc, s3 } = setup();
    s3.delete.mockRejectedValue(new Error("s3 fora"));
    await expect(
      svc.replaceAll("s1", [replacement], { f: file }),
    ).resolves.toHaveLength(1);
  });
});
