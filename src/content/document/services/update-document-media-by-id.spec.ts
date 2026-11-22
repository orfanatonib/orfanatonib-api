import { BadRequestException } from "@nestjs/common";
import { UpdateDocumentService } from "./update-document.service";

const file = {
  originalname: "novo.pdf",
  size: 7,
  buffer: Buffer.from("x"),
} as Express.Multer.File;

interface StoredMedia {
  id: string;
  url: string;
  isLocalFile: boolean;
  title?: string;
  uploadType?: string;
  originalName?: string;
  size?: number;
}

/** `PATCH /documents/:id` com o `id` da mídia: atualiza a linha existente (a troca de arquivo não pode ser ignorada). */
function setup(stored: StoredMedia) {
  const existing = { id: "d1", name: "Doc", route: null };
  const manager = {
    merge: (_entity: unknown, current: object, values: object) => ({
      ...current,
      ...values,
    }),
    save: jest.fn((...args: unknown[]) =>
      Promise.resolve(args[args.length - 1]),
    ),
  };
  const dataSource = {
    transaction: jest.fn((cb: (m: unknown) => Promise<unknown>) => cb(manager)),
  };
  const s3 = { upload: jest.fn().mockResolvedValue("https://b/new.pdf") };
  const mediaStorage = {
    deleteAfterCommit: jest.fn().mockResolvedValue(undefined),
  };
  const media = {
    findMediaItemsByTarget: jest.fn().mockResolvedValue([stored]),
  };
  const repo = { findOneWithRelations: jest.fn().mockResolvedValue(existing) };
  const svc = new UpdateDocumentService(
    dataSource as never,
    repo as never,
    s3 as never,
    media as never,
    {} as never,
    mediaStorage as never,
  );
  return { svc, s3, manager, mediaStorage };
}

const withId = (over: Record<string, unknown>) =>
  ({
    name: "Doc",
    description: "d",
    media: { id: "m1", title: "t", ...over },
  }) as never;

describe("UpdateDocumentService — mídia enviada com id", () => {
  it("arquivo novo sobre um upload existente: grava o novo na mesma linha e o antigo só sai depois do commit", async () => {
    const stored: StoredMedia = {
      id: "m1",
      url: "https://b/old.pdf",
      isLocalFile: true,
    };
    const { svc, s3, manager, mediaStorage } = setup(stored);

    await svc.execute(
      "d1",
      withId({ isLocalFile: true, uploadType: "upload" }),
      file,
    );

    expect(s3.upload).toHaveBeenCalledWith(file);
    expect(manager.save).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "m1",
        url: "https://b/new.pdf",
        originalName: "novo.pdf",
        size: 7,
        isLocalFile: true,
      }),
    );
    expect(mediaStorage.deleteAfterCommit).toHaveBeenCalledWith([
      "https://b/old.pdf",
    ]);
  });

  it("sem arquivo novo, o upload existente continua como está (nada sobe, nada sai)", async () => {
    const stored: StoredMedia = {
      id: "m1",
      url: "https://b/old.pdf",
      isLocalFile: true,
    };
    const { svc, s3, mediaStorage } = setup(stored);

    await svc.execute(
      "d1",
      withId({ isLocalFile: true, uploadType: "upload" }),
      undefined,
    );

    expect(s3.upload).not.toHaveBeenCalled();
    expect(mediaStorage.deleteAfterCommit).toHaveBeenLastCalledWith([]);
  });

  it("link virando upload exige o arquivo", async () => {
    const stored: StoredMedia = {
      id: "m1",
      url: "https://x/y.pdf",
      isLocalFile: false,
    };
    const { svc } = setup(stored);

    await expect(
      svc.execute(
        "d1",
        withId({ isLocalFile: true, uploadType: "upload" }),
        undefined,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("link virando upload com arquivo: sobe e não há arquivo antigo para apagar", async () => {
    const stored: StoredMedia = {
      id: "m1",
      url: "https://x/y.pdf",
      isLocalFile: false,
    };
    const { svc, s3, mediaStorage } = setup(stored);

    await svc.execute(
      "d1",
      withId({ isLocalFile: true, uploadType: "upload" }),
      file,
    );

    expect(s3.upload).toHaveBeenCalledWith(file);
    expect(mediaStorage.deleteAfterCommit).toHaveBeenLastCalledWith([]);
  });
});
