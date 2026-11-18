/* eslint-disable @typescript-eslint/require-await -- dublês assíncronos de teste */
import {
  BadRequestException,
  InternalServerErrorException,
  NotFoundException,
} from "@nestjs/common";

import { MediaItemEntity } from "src/shared/media/media-item/media-item.entity";
import { MediaItemProcessor } from "src/shared/media/media-item-processor";
import { CreateIntegrationService } from "./create-integration.service";
import { DeleteIntegrationService } from "./delete-integration.service";
import { UpdateIntegrationService } from "./update-integration.service";

const file = (name: string, field = name) =>
  ({
    originalname: name,
    fieldname: field,
    mimetype: "image/png",
    size: 4,
    buffer: Buffer.from("x"),
  }) as Express.Multer.File;
const row = (id: string, url: string, local = true) =>
  Object.assign(new MediaItemEntity(), {
    id,
    url,
    isLocalFile: local,
    targetId: "i1",
  });

function setup() {
  const processor = new MediaItemProcessor({} as never);
  let seq = 0;
  const save = jest
    .spyOn(processor, "saveMediaItem")
    .mockImplementation(async (m) => Object.assign(m, { id: `m${++seq}` }));
  const upsert = jest
    .spyOn(processor, "upsertMediaItem")
    .mockImplementation(async (_i, m) => m);
  const findMany = jest
    .spyOn(processor, "findMediaItemsByTarget")
    .mockResolvedValue([]);
  const removeRows = jest
    .spyOn(processor, "removeMediaItemsKeepingFiles")
    .mockResolvedValue([]);
  const removeOne = jest
    .spyOn(processor, "removeMediaItem")
    .mockResolvedValue(undefined);

  const batch = {
    objects: [] as Array<{ key: string; url: string }>,
    discard: jest.fn(async () => undefined),
    commit: jest.fn(),
  };
  const storage = {
    newBatch: jest.fn(() => batch),
    uploadAll: jest.fn(async () => {
      const n = batch.objects.length + 1;
      batch.objects.push({
        key: `local/Integration/i1/${n}.png`,
        url: `http://s/b/local/Integration/i1/${n}.png`,
      });
    }),
    deleteAfterCommit: jest.fn(async () => undefined),
  };
  const repo = {
    create: jest.fn(async () => ({ id: "i1", name: "N" })),
    findById: jest.fn(async () => ({ id: "i1", name: "N" })),
    update: jest.fn(async () => ({ id: "i1", name: "N" })),
    remove: jest.fn(async () => undefined),
  };
  return {
    batch,
    storage,
    repo,
    save,
    upsert,
    findMany,
    removeRows,
    removeOne,
    create: new CreateIntegrationService(
      repo as never,
      processor,
      storage as never,
    ),
    update: new UpdateIntegrationService(
      repo as never,
      processor,
      storage as never,
    ),
    remove: new DeleteIntegrationService(
      repo as never,
      processor,
      storage as never,
    ),
  };
}

const base = {
  name: "N",
  phone: "1",
  gaLeader: "g",
  baptized: true,
  churchYears: 1,
  previousMinistry: "p",
  integrationYear: 2026,
};

describe("integração × S3 (sem órfão, sem referência quebrada)", () => {
  describe("create", () => {
    it("com arquivos: sobe todos, grava as linhas com storageKey e confirma o lote", async () => {
      const { create, save, batch } = setup();
      await create.execute(base as never, [file("a.png"), file("b.png")]);
      expect(save).toHaveBeenCalledTimes(2);
      expect(save.mock.calls[0][0].storageKey).toBe(
        "local/Integration/i1/1.png",
      );
      expect(batch.commit).toHaveBeenCalledTimes(1);
    });

    it("falha na 2ª linha: descarta os uploads, remove as linhas gravadas E a integração", async () => {
      const { create, save, batch, removeRows, repo } = setup();
      save
        .mockImplementationOnce(async (m) => Object.assign(m, { id: "m1" }))
        .mockRejectedValueOnce(new Error("db"));
      await expect(
        create.execute(base as never, [file("a.png"), file("b.png")]),
      ).rejects.toThrow("db");
      expect(batch.discard).toHaveBeenCalledTimes(1);
      expect(removeRows).toHaveBeenCalledWith([
        expect.objectContaining({ id: "m1" }),
      ]);
      expect(repo.remove).toHaveBeenCalledWith("i1");
    });

    it("política recusa o arquivo: integração removida, nada no bucket", async () => {
      const { create, storage, repo, batch } = setup();
      storage.uploadAll.mockRejectedValue(new BadRequestException("MIME"));
      await expect(
        create.execute(base as never, [file("a.png")]),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(batch.discard).toHaveBeenCalledTimes(1);
      expect(repo.remove).toHaveBeenCalledWith("i1");
    });

    it("só links: não toca no bucket", async () => {
      const { create, storage } = setup();
      await create.execute({
        ...base,
        images: [{ url: "https://x/y.png", title: "t" }],
      } as never);
      expect(storage.uploadAll).not.toHaveBeenCalled();
    });
  });

  describe("update", () => {
    const images = [{ id: "m1", fieldKey: "f1", title: "t" }];

    it("substituir arquivo: grava o novo e só depois apaga o antigo", async () => {
      const { update, findMany, upsert, storage } = setup();
      findMany.mockResolvedValue([row("m1", "http://s/b/old.png")]);
      const order: string[] = [];
      upsert.mockImplementation(async (_i, m) => {
        order.push("save");
        return m;
      });
      storage.deleteAfterCommit.mockImplementation(async () => {
        order.push("delete-old");
      });
      await update.execute("i1", { images } as never, [file("n.png", "f1")]);
      expect(order).toEqual(["save", "delete-old"]);
      expect(storage.deleteAfterCommit).toHaveBeenCalledWith([
        "http://s/b/old.png",
      ]);
    });

    it("falha ao gravar: descarta o novo e NÃO apaga o antigo", async () => {
      const { update, findMany, upsert, batch, storage } = setup();
      findMany.mockResolvedValue([row("m1", "http://s/b/old.png")]);
      upsert.mockRejectedValue(new Error("db"));
      await expect(
        update.execute("i1", { images } as never, [file("n.png", "f1")]),
      ).rejects.toBeInstanceOf(InternalServerErrorException);
      expect(batch.discard).toHaveBeenCalledTimes(1);
      expect(storage.deleteAfterCommit).not.toHaveBeenCalled();
    });

    it("imagem que saiu da lista: linha removida agora, objeto depois", async () => {
      const { update, findMany, removeOne, storage } = setup();
      findMany.mockResolvedValue([
        row("m1", "http://s/b/a.png"),
        row("m2", "http://s/b/b.png"),
      ]);
      await update.execute("i1", {
        images: [{ id: "m1", title: "keep" }],
      } as never);
      expect(removeOne).toHaveBeenCalledTimes(1);
      expect(storage.deleteAfterCommit).toHaveBeenCalledWith([
        "http://s/b/b.png",
      ]);
    });

    it("imagem nova sem arquivo: 400 e nada enviado; integração inexistente: 404", async () => {
      const { update, storage, repo } = setup();
      await expect(
        update.execute(
          "i1",
          { images: [{ title: "x", fieldKey: "f" }] } as never,
          [],
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(storage.uploadAll).not.toHaveBeenCalled();
      repo.findById.mockResolvedValueOnce(null as never);
      await expect(update.execute("x", {} as never)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe("delete", () => {
    it("integração e linhas primeiro, objetos depois", async () => {
      const { remove, findMany, repo, removeRows, storage } = setup();
      findMany.mockResolvedValue([row("m1", "http://s/b/a.png")]);
      const order: string[] = [];
      repo.remove.mockImplementation(async () => {
        order.push("integration");
      });
      removeRows.mockImplementation(async () => {
        order.push("rows");
        return ["http://s/b/a.png"];
      });
      storage.deleteAfterCommit.mockImplementation(async () => {
        order.push("objects");
      });
      await remove.execute("i1");
      expect(order).toEqual(["integration", "rows", "objects"]);
    });

    it("falha do banco: nenhum objeto apagado; inexistente: 404", async () => {
      const { remove, repo, storage } = setup();
      repo.remove.mockRejectedValue(new Error("db"));
      await expect(remove.execute("i1")).rejects.toBeInstanceOf(
        InternalServerErrorException,
      );
      expect(storage.deleteAfterCommit).not.toHaveBeenCalled();
      repo.findById.mockResolvedValueOnce(null as never);
      await expect(remove.execute("x")).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });
});
