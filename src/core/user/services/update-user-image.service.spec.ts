/* eslint-disable @typescript-eslint/require-await -- dublês assíncronos de teste */
import { BadRequestException } from "@nestjs/common";

import {
  MediaItemEntity,
  UploadType,
} from "src/shared/media/media-item/media-item.entity";
import { MediaItemProcessor } from "src/shared/media/media-item-processor";
import { UpdateUserImageService } from "./update-user-image.service";

const png = (name = "file") =>
  ({
    fieldname: name,
    originalname: "a.png",
    mimetype: "image/png",
    size: 4,
    buffer: Buffer.from("x"),
  }) as Express.Multer.File;

function setup(existing: MediaItemEntity | null) {
  const processor = new MediaItemProcessor({} as never);
  jest.spyOn(processor, "findMediaItemByTarget").mockResolvedValue(existing);
  const upsert = jest
    .spyOn(processor, "upsertMediaItem")
    .mockImplementation(async (_i, m) => m);
  const save = jest
    .spyOn(processor, "saveMediaItem")
    .mockImplementation(async (m) => m);
  const batchState = {
    discarded: 0,
    committed: 0,
    objects: [] as Array<{ key: string; url: string }>,
  };
  const storage = {
    newBatch: jest.fn(() => ({
      get objects() {
        return batchState.objects;
      },
      discard: async () => {
        batchState.discarded++;
      },
      commit: () => {
        batchState.committed++;
      },
    })),
    uploadAll: jest.fn(async () => {
      batchState.objects.push({
        key: "local/User/u1/new.png",
        url: "http://s/b/local/User/u1/new.png",
      });
    }),
    deleteAfterCommit: jest.fn(async () => undefined),
  };
  const users = { findOne: jest.fn(async () => ({ id: "u1" })) };
  const svc = new UpdateUserImageService(
    users as never,
    processor,
    storage as never,
  );
  return { svc, storage, upsert, save, batchState };
}

const oldLocal = Object.assign(new MediaItemEntity(), {
  id: "m1",
  url: "http://s/b/local/User/u1/old.png",
  isLocalFile: true,
});

describe("UpdateUserImageService (S3 sem órfão e sem referência quebrada)", () => {
  it("sem dados: 400", async () => {
    const { svc } = setup(null);
    await expect(svc.updateUserImage("u1", {}, [])).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it("nem URL nem arquivo: 400 e nada enviado", async () => {
    const { svc, storage } = setup(null);
    await expect(
      svc.updateUserImage(
        "u1",
        { imageData: JSON.stringify({ title: "x" }) },
        [],
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(storage.uploadAll).not.toHaveBeenCalled();
  });

  it("substituir foto: grava o novo e SÓ DEPOIS apaga o antigo", async () => {
    const { svc, storage, upsert } = setup(oldLocal);
    const order: string[] = [];
    upsert.mockImplementation(async (_i, m) => {
      order.push("save");
      return m;
    });
    storage.deleteAfterCommit.mockImplementation(async () => {
      order.push("delete-old");
    });
    await svc.updateUserImage(
      "u1",
      { title: "t", uploadType: UploadType.UPLOAD },
      [png()],
    );
    expect(order).toEqual(["save", "delete-old"]);
    expect(storage.deleteAfterCommit).toHaveBeenCalledWith([oldLocal.url]);
    expect(upsert.mock.calls[0][1].storageKey).toBe("local/User/u1/new.png");
  });

  it("falha ao gravar no banco: descarta o novo e NÃO apaga o antigo", async () => {
    const { svc, storage, upsert, batchState } = setup(oldLocal);
    upsert.mockRejectedValue(new Error("db"));
    await expect(
      svc.updateUserImage("u1", { title: "t" }, [png()]),
    ).rejects.toThrow("db");
    expect(batchState.discarded).toBe(1);
    expect(storage.deleteAfterCommit).not.toHaveBeenCalled();
  });

  it("arquivo que não é imagem: 400, nada enviado, antigo preservado", async () => {
    const { svc, storage } = setup(oldLocal);
    const pdf = {
      ...png(),
      mimetype: "application/pdf",
    } as Express.Multer.File;
    await expect(
      svc.updateUserImage("u1", { title: "t" }, [pdf]),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(storage.uploadAll).not.toHaveBeenCalled();
    expect(storage.deleteAfterCommit).not.toHaveBeenCalled();
  });

  it("trocar arquivo por link apaga o objeto antigo depois de gravar", async () => {
    const { svc, storage } = setup(oldLocal);
    await svc.updateUserImage(
      "u1",
      { title: "t", url: "https://img/x.png" },
      [],
    );
    expect(storage.uploadAll).not.toHaveBeenCalled();
    expect(storage.deleteAfterCommit).toHaveBeenCalledWith([oldLocal.url]);
  });

  it("primeira foto por upload: cria sem apagar nada", async () => {
    const { svc, save, storage } = setup(null);
    await svc.updateUserImage("u1", { title: "t" }, [png()]);
    expect(save).toHaveBeenCalledTimes(1);
    expect(storage.deleteAfterCommit).not.toHaveBeenCalled();
  });

  it("fieldKey sem arquivo correspondente: 400 e nada enviado", async () => {
    const { svc, storage } = setup(null);
    await expect(
      svc.updateUserImage(
        "u1",
        { imageData: JSON.stringify({ title: "t", fieldKey: "foto" }) },
        [png("outro")],
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(storage.uploadAll).not.toHaveBeenCalled();
  });
});
