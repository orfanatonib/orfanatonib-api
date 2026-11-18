/* eslint-disable @typescript-eslint/require-await -- dublês assíncronos de teste */
import {
  InternalServerErrorException,
  NotFoundException,
} from "@nestjs/common";

import { MediaItemEntity } from "src/shared/media/media-item/media-item.entity";
import { MediaItemProcessor } from "src/shared/media/media-item-processor";
import { EventAudience } from "../entities/event.entity";
import { CreateEventService } from "./create-event.service";
import { DeleteEventService } from "./delete-event.service";
import { UpdateEventService } from "./update-event.service";

const png = {
  originalname: "a.png",
  mimetype: "image/png",
  size: 4,
  buffer: Buffer.from("x"),
} as Express.Multer.File;
const oldLocal = Object.assign(new MediaItemEntity(), {
  id: "m1",
  url: "http://s/b/local/Event/e1/old.png",
  isLocalFile: true,
});

function setup() {
  const processor = new MediaItemProcessor({} as never);
  const saveMedia = jest
    .spyOn(processor, "saveMediaItem")
    .mockImplementation(async (m) => m);
  const upsert = jest
    .spyOn(processor, "upsertMediaItem")
    .mockImplementation(async (_i, m) => m);
  const findByTarget = jest
    .spyOn(processor, "findMediaItemByTarget")
    .mockResolvedValue(null);
  const findMany = jest
    .spyOn(processor, "findMediaItemsByTarget")
    .mockResolvedValue([]);
  const removeKeeping = jest
    .spyOn(processor, "removeMediaItemsKeepingFiles")
    .mockResolvedValue([]);

  const batch = {
    objects: [] as Array<{ key: string; url: string }>,
    discard: jest.fn(async () => undefined),
    commit: jest.fn(),
  };
  const storage = {
    newBatch: jest.fn(() => batch),
    uploadAll: jest.fn(async () => {
      batch.objects.push({
        key: "local/Event/e1/new.png",
        url: "http://s/b/local/Event/e1/new.png",
      });
    }),
    deleteAfterCommit: jest.fn(async () => undefined),
  };
  const repo = {
    create: jest.fn(async () => ({ id: "e1" })),
    findById: jest.fn(async () => ({ id: "e1" })),
    update: jest.fn(async () => undefined),
    remove: jest.fn(async () => undefined),
  };
  const notify = {
    notifyEventCreated: jest.fn(async () => undefined),
    notifyEventUpdated: jest.fn(async () => undefined),
    notifyEventDeleted: jest.fn(async () => undefined),
  };
  return {
    batch,
    storage,
    repo,
    saveMedia,
    upsert,
    findByTarget,
    findMany,
    removeKeeping,
    create: new CreateEventService(
      repo as never,
      processor,
      storage as never,
      notify as never,
    ),
    update: new UpdateEventService(
      repo as never,
      processor,
      storage as never,
      notify as never,
    ),
    remove: new DeleteEventService(
      repo as never,
      processor,
      storage as never,
      notify as never,
    ),
  };
}

const dto = {
  title: "T",
  date: "2026-12-01",
  location: "L",
  description: "D",
  audience: EventAudience.ALL,
};

describe("eventos × S3 (sem órfão, sem referência quebrada)", () => {
  describe("create", () => {
    it("sem arquivo: não toca no bucket", async () => {
      const { create, storage } = setup();
      await create.create(dto as never);
      expect(storage.uploadAll).not.toHaveBeenCalled();
    });

    it("com arquivo: sobe, grava a linha com storageKey e confirma o lote", async () => {
      const { create, saveMedia, batch } = setup();
      await create.create(dto as never, png);
      expect(saveMedia.mock.calls[0][0].storageKey).toBe(
        "local/Event/e1/new.png",
      );
      expect(batch.commit).toHaveBeenCalledTimes(1);
    });

    it("falha ao gravar a mídia: descarta o upload E remove o evento (nada fica)", async () => {
      const { create, saveMedia, batch, repo } = setup();
      saveMedia.mockRejectedValue(new Error("db"));
      await expect(create.create(dto as never, png)).rejects.toBeInstanceOf(
        InternalServerErrorException,
      );
      expect(batch.discard).toHaveBeenCalledTimes(1);
      expect(repo.remove).toHaveBeenCalledWith("e1");
    });

    it("política de upload recusada (MIME): evento removido e erro de validação preservado", async () => {
      const { create, storage, repo } = setup();
      const bad = Object.assign(new Error("MIME"), { getStatus: () => 400 });
      storage.uploadAll.mockRejectedValue(bad);
      await expect(create.create(dto as never, png)).rejects.toBe(bad);
      expect(repo.remove).toHaveBeenCalledWith("e1");
    });
  });

  describe("update", () => {
    it("trocar o arquivo: grava o novo e só depois apaga o antigo", async () => {
      const { update, findByTarget, upsert, storage } = setup();
      findByTarget.mockResolvedValue(oldLocal);
      const order: string[] = [];
      upsert.mockImplementation(async (_i, m) => {
        order.push("save");
        return m;
      });
      storage.deleteAfterCommit.mockImplementation(async () => {
        order.push("delete-old");
      });
      await update.update("e1", { title: "N" }, png);
      expect(order).toEqual(["save", "delete-old"]);
      expect(storage.deleteAfterCommit).toHaveBeenCalledWith([oldLocal.url]);
    });

    it("falha ao gravar: descarta o novo e NÃO apaga o antigo", async () => {
      const { update, findByTarget, upsert, batch, storage } = setup();
      findByTarget.mockResolvedValue(oldLocal);
      upsert.mockRejectedValue(new Error("db"));
      await expect(update.update("e1", {}, png)).rejects.toBeInstanceOf(
        InternalServerErrorException,
      );
      expect(batch.discard).toHaveBeenCalledTimes(1);
      expect(storage.deleteAfterCommit).not.toHaveBeenCalled();
    });

    it("trocar arquivo por link apaga o antigo depois de gravar", async () => {
      const { update, findByTarget, storage } = setup();
      findByTarget.mockResolvedValue(oldLocal);
      await update.update("e1", {
        media: { url: "https://img/x.png", isLocalFile: false },
      });
      expect(storage.uploadAll).not.toHaveBeenCalled();
      expect(storage.deleteAfterCommit).toHaveBeenCalledWith([oldLocal.url]);
    });

    it("sem mídia nova não toca no bucket; evento inexistente é 404", async () => {
      const { update, storage, repo } = setup();
      await update.update("e1", { title: "N" });
      expect(storage.uploadAll).not.toHaveBeenCalled();
      repo.findById.mockResolvedValueOnce(null as never);
      await expect(update.update("x", {})).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe("delete", () => {
    it("remove o evento e as linhas ANTES de apagar os objetos", async () => {
      const { remove, repo, removeKeeping, findMany, storage } = setup();
      findMany.mockResolvedValue([oldLocal]);
      removeKeeping.mockResolvedValue([oldLocal.url]);
      const order: string[] = [];
      repo.remove.mockImplementation(async () => {
        order.push("event");
      });
      removeKeeping.mockImplementation(async () => {
        order.push("rows");
        return [oldLocal.url];
      });
      storage.deleteAfterCommit.mockImplementation(async () => {
        order.push("objects");
      });
      await remove.remove("e1");
      expect(order).toEqual(["event", "rows", "objects"]);
    });

    it("falha do banco: nenhum objeto é apagado", async () => {
      const { remove, repo, storage, findMany } = setup();
      findMany.mockResolvedValue([oldLocal]);
      repo.remove.mockRejectedValue(new Error("db"));
      await expect(remove.remove("e1")).rejects.toThrow("db");
      expect(storage.deleteAfterCommit).not.toHaveBeenCalled();
    });

    it("evento inexistente: 404 sem tocar no bucket", async () => {
      const { remove, repo, storage } = setup();
      repo.findById.mockResolvedValueOnce(null as never);
      await expect(remove.remove("x")).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(storage.deleteAfterCommit).not.toHaveBeenCalled();
    });
  });
});
