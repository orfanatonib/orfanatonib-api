/* eslint-disable @typescript-eslint/require-await, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument -- dublês de teste */
import { BadRequestException, Logger } from "@nestjs/common";

import { CreateDocumentService } from "./create-document.service";
import { UpdateDocumentService } from "./update-document.service";

const file = { originalname: "a.pdf", size: 10 } as Express.Multer.File;

beforeEach(() => {
  jest.spyOn(Logger.prototype, "error").mockImplementation();
});
afterEach(() => jest.restoreAllMocks());

describe("CreateDocumentService: objeto enviado ao bucket não fica órfão", () => {
  function setup(failAt: "route" | "media" | null) {
    const runner = {
      connect: jest.fn(),
      startTransaction: jest.fn(),
      commitTransaction: jest.fn(),
      rollbackTransaction: jest.fn(),
      release: jest.fn(),
      manager: {
        getRepository: jest.fn().mockReturnValue({
          create: jest.fn((x: object) => x),
          save: jest.fn().mockResolvedValue({ id: "d1", name: "Doc" }),
        }),
        save: jest.fn(),
      },
    };
    const dataSource = { createQueryRunner: jest.fn().mockReturnValue(runner) };
    const s3 = {
      upload: jest.fn().mockResolvedValue("https://b.s3.amazonaws.com/x.pdf"),
      delete: jest.fn().mockResolvedValue(undefined),
    };
    const routes = {
      generateAvailablePath: jest.fn().mockResolvedValue("documento_x"),
      createRouteWithManager:
        failAt === "route"
          ? jest.fn().mockRejectedValue(new Error("rota"))
          : jest.fn().mockResolvedValue({ id: "r1" }),
    };
    const media = {
      buildBaseMediaItem: jest.fn().mockReturnValue({}),
      saveMediaItem:
        failAt === "media"
          ? jest.fn().mockRejectedValue(new Error("banco"))
          : jest.fn().mockResolvedValue({ id: "m1" }),
    };
    const svc = new CreateDocumentService(
      dataSource as never,
      {} as never,
      s3 as never,
      routes as never,
      media as never,
    );
    return { svc, runner, s3 };
  }

  const dto = {
    name: "Doc",
    description: "d",
    media: { title: "t", isLocalFile: true, uploadType: "upload" },
  } as never;

  it("falha ao salvar a mídia depois do upload: rollback E o objeto enviado é apagado", async () => {
    const { svc, runner, s3 } = setup("media");
    await expect(svc.createDocument(dto, file)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(runner.rollbackTransaction).toHaveBeenCalled();
    expect(s3.delete).toHaveBeenCalledWith("https://b.s3.amazonaws.com/x.pdf");
  });

  it("falha antes do upload: nada foi enviado, nada a apagar", async () => {
    const { svc, s3 } = setup("route");
    await expect(svc.createDocument(dto, file)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(s3.upload).not.toHaveBeenCalled();
    expect(s3.delete).not.toHaveBeenCalled();
  });

  it("feliz: confirma e não apaga nada", async () => {
    const { svc, runner, s3 } = setup(null);
    await svc.createDocument(dto, file);
    expect(runner.commitTransaction).toHaveBeenCalled();
    expect(s3.delete).not.toHaveBeenCalled();
  });

  it("se apagar o órfão também falhar, o erro original continua sendo o devolvido", async () => {
    const { svc, s3 } = setup("media");
    s3.delete.mockRejectedValue(new Error("s3 fora"));
    await expect(svc.createDocument(dto, file)).rejects.toThrow(
      "Error creating document: banco",
    );
  });
});

describe("UpdateDocumentService: o objeto antigo só some depois do commit", () => {
  function setup(txBehavior: (manager: unknown) => Promise<unknown>) {
    const existing = { id: "d1", name: "Doc", route: null };
    const repo = {
      findOneWithRelations: jest.fn().mockResolvedValue(existing),
    };
    const manager = {
      merge: (_entity: unknown, current: object, values: object) => ({
        ...current,
        ...values,
      }),
      save: jest.fn(async (_entity: unknown, value: object) => value),
    };
    const dataSource = {
      transaction: jest.fn((cb: (m: unknown) => Promise<unknown>) =>
        cb(manager).then(txBehavior),
      ),
    };
    const s3 = {
      upload: jest.fn().mockResolvedValue("https://b/new.pdf"),
      delete: jest.fn().mockResolvedValue(undefined),
    };
    const mediaStorage = {
      deleteAfterCommit: jest.fn().mockResolvedValue(undefined),
    };
    const media = {
      findMediaItemsByTarget: jest
        .fn()
        .mockResolvedValue([
          { id: "m1", url: "https://b/old.pdf", isLocalFile: true },
        ]),
      cleanAndReplaceMediaItems: jest.fn(
        async (
          _items,
          _id,
          _t,
          _files,
          existingMedia,
          del: (u: string) => Promise<void>,
          up: (f: Express.Multer.File) => Promise<string>,
        ) => {
          await up(file);
          for (const m of existingMedia) await del(m.url);
        },
      ),
    };
    const svc = new UpdateDocumentService(
      dataSource as never,
      repo as never,
      s3 as never,
      media as never,
      {} as never,
      mediaStorage as never,
    );
    return { svc, s3, media, mediaStorage };
  }

  const dto = {
    name: "Doc",
    description: "d",
    media: { title: "t", isLocalFile: true },
  } as never;

  it("[media-upload.legacy-update.document#feliz] feliz: sobe o novo, e só depois do commit apaga o antigo", async () => {
    const order: string[] = [];
    const { svc, mediaStorage } = setup(async (v) => {
      order.push("commit");
      return v;
    });
    mediaStorage.deleteAfterCommit.mockImplementation(
      async (urls: string[]) => {
        order.push(`delete:${urls.join(",")}`);
      },
    );
    await svc.execute("d1", dto, file);
    expect(order).toEqual(["commit", "delete:https://b/old.pdf"]);
  });

  it("[media-upload.legacy-update.document#rollback-transacao] transação falha depois do upload: apaga o NOVO e preserva o antigo", async () => {
    const { svc, mediaStorage } = setup(async () => {
      throw new Error("tx");
    });
    await expect(svc.execute("d1", dto, file)).rejects.toThrow("tx");
    expect(mediaStorage.deleteAfterCommit).toHaveBeenCalledTimes(1);
    expect(mediaStorage.deleteAfterCommit).toHaveBeenCalledWith([
      "https://b/new.pdf",
    ]);
  });
});
