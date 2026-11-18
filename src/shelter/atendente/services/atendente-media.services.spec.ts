/* eslint-disable @typescript-eslint/require-await -- dublês assíncronos de teste */
import {
  BadRequestException,
  InternalServerErrorException,
} from "@nestjs/common";

import { MediaItemEntity } from "src/shared/media/media-item/media-item.entity";
import { MediaItemProcessor } from "src/shared/media/media-item-processor";
import { CreateAtendenteService } from "./create-atendente.service";
import { DeleteAtendenteService } from "./delete-atendente.service";
import { UpdateAtendenteService } from "./update-atendente.service";

const pdf = (name: string) =>
  ({
    originalname: name,
    fieldname: name,
    mimetype: "application/pdf",
    size: 4,
    buffer: Buffer.from("x"),
  }) as Express.Multer.File;
const row = (id: string, url: string) =>
  Object.assign(new MediaItemEntity(), { id, url, isLocalFile: true });

function setup() {
  const processor = new MediaItemProcessor({} as never);
  let seq = 0;
  const save = jest
    .spyOn(processor, "saveMediaItem")
    .mockImplementation(async (m) => Object.assign(m, { id: `m${++seq}` }));
  const findOne = jest
    .spyOn(processor, "findMediaItemByTarget")
    .mockResolvedValue(null);
  const findMany = jest
    .spyOn(processor, "findMediaItemsByTarget")
    .mockResolvedValue([]);
  const removeRows = jest
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
      const n = batch.objects.length + 1;
      batch.objects.push({
        key: `local/AtendenteEstadual/a1/${n}.pdf`,
        url: `http://s/b/local/AtendenteEstadual/a1/${n}.pdf`,
      });
    }),
    deleteAfterCommit: jest.fn(async () => undefined),
  };
  const repo = {
    create: jest.fn(async () => ({
      id: "a1",
      name: "N",
      attendableType: null,
      attendableId: null,
    })),
    findById: jest.fn(async () => ({
      id: "a1",
      name: "N",
      attendableType: null,
      attendableId: null,
    })),
    findByAttendable: jest.fn(async () => null),
    update: jest.fn(async () => ({
      id: "a1",
      name: "N",
      attendableType: null,
      attendableId: null,
    })),
    remove: jest.fn(async () => undefined),
  };
  return {
    batch,
    storage,
    repo,
    save,
    findOne,
    findMany,
    removeRows,
    create: new CreateAtendenteService(
      repo as never,
      processor,
      storage as never,
    ),
    update: new UpdateAtendenteService(
      repo as never,
      processor,
      storage as never,
    ),
    remove: new DeleteAtendenteService(
      repo as never,
      processor,
      storage as never,
    ),
  };
}

describe("antecedentes (PDF sensível) × S3", () => {
  describe("create", () => {
    it("sem PDF: 400 e nada criado", async () => {
      const { create, repo } = setup();
      await expect(
        create.execute({ name: "N" } as never, {}),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(repo.create).not.toHaveBeenCalled();
    });

    it("2º PDF falha: descarta os uploads, remove a linha do 1º E o cadastro", async () => {
      const { create, save, batch, removeRows, repo } = setup();
      save
        .mockImplementationOnce(async (m) => Object.assign(m, { id: "m1" }))
        .mockRejectedValueOnce(new Error("db"));
      await expect(
        create.execute({ name: "N" } as never, {
          estadual: pdf("e.pdf"),
          federal: pdf("f.pdf"),
        }),
      ).rejects.toThrow("db");
      expect(batch.discard).toHaveBeenCalledTimes(1);
      expect(removeRows).toHaveBeenCalledWith([
        expect.objectContaining({ id: "m1" }),
      ]);
      expect(repo.remove).toHaveBeenCalledWith("a1");
    });

    it("feliz: grava com storageKey e confirma o lote", async () => {
      const { create, save, batch } = setup();
      await create.execute({ name: "N" } as never, { estadual: pdf("e.pdf") });
      expect(save.mock.calls[0][0].storageKey).toBe(
        "local/AtendenteEstadual/a1/1.pdf",
      );
      expect(batch.commit).toHaveBeenCalledTimes(1);
    });
  });

  describe("update", () => {
    it("trocar PDF: grava o novo e só depois remove o antigo", async () => {
      const { update, findOne, save, removeRows, storage } = setup();
      const old = row("old", "http://s/b/old.pdf");
      findOne.mockResolvedValue(old);
      const order: string[] = [];
      save.mockImplementation(async (m) => {
        order.push("save");
        return m;
      });
      removeRows.mockImplementation(async () => {
        order.push("rows");
        return [old.url];
      });
      storage.deleteAfterCommit.mockImplementation(async () => {
        order.push("object");
      });
      await update.execute("a1", {} as never, { estadual: pdf("n.pdf") });
      expect(order).toEqual(["save", "rows", "object"]);
    });

    it("falha ao gravar: descarta o novo e mantém o antigo intocado", async () => {
      const { update, findOne, save, batch, removeRows, storage } = setup();
      findOne.mockResolvedValue(row("old", "http://s/b/old.pdf"));
      save.mockRejectedValue(new Error("db"));
      await expect(
        update.execute("a1", {} as never, { estadual: pdf("n.pdf") }),
      ).rejects.toThrow("db");
      expect(batch.discard).toHaveBeenCalledTimes(1);
      expect(removeRows).not.toHaveBeenCalled();
      expect(storage.deleteAfterCommit).not.toHaveBeenCalled();
    });
  });

  describe("delete", () => {
    it("cadastro e linhas primeiro, PDFs depois; falha do banco não apaga nada", async () => {
      const { remove, findMany, repo, removeRows, storage } = setup();
      findMany.mockResolvedValue([row("m1", "http://s/b/e.pdf")]);
      const order: string[] = [];
      repo.remove.mockImplementation(async () => {
        order.push("cadastro");
      });
      removeRows.mockImplementation(async () => {
        order.push("rows");
        return ["http://s/b/e.pdf"];
      });
      storage.deleteAfterCommit.mockImplementation(async () => {
        order.push("objects");
      });
      await remove.execute("a1");
      expect(order).toEqual(["cadastro", "rows", "objects"]);

      storage.deleteAfterCommit.mockClear();
      repo.remove.mockRejectedValue(new Error("db"));
      await expect(remove.execute("a1")).rejects.toBeInstanceOf(
        InternalServerErrorException,
      );
      expect(storage.deleteAfterCommit).not.toHaveBeenCalled();
    });
  });
});
