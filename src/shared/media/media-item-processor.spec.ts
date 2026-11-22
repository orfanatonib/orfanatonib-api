/* eslint-disable @typescript-eslint/require-await -- dublês assíncronos de teste */
import {
  MediaItemEntity,
  MediaType,
  UploadType,
} from "./media-item/media-item.entity";
import { MediaItemProcessor } from "./media-item-processor";

function file(name: string): Express.Multer.File {
  return {
    originalname: name,
    size: 3,
    buffer: Buffer.from("abc"),
  } as Express.Multer.File;
}

function setup() {
  const saved: MediaItemEntity[] = [];
  const repo = {
    save: jest.fn(async (m: MediaItemEntity) => {
      m.id = `id${saved.length}`;
      saved.push(m);
      return m;
    }),
    removeMany: jest.fn(async () => undefined),
    removeOne: jest.fn(async () => undefined),
  };
  return { repo, proc: new MediaItemProcessor(repo as never) };
}

const upload = (field: string) => ({
  title: field,
  description: "d",
  mediaType: MediaType.IMAGE,
  uploadType: UploadType.UPLOAD,
  fileField: field,
});

describe("MediaItemProcessor.processMediaItemsPolymorphic", () => {
  it("sobe upload e grava link sem tocar no S3", async () => {
    const { proc } = setup();
    const uploadFn = jest.fn(
      async (f: Express.Multer.File) => `u/${f.originalname}`,
    );
    const out = await proc.processMediaItemsPolymorphic(
      [
        upload("a"),
        {
          title: "l",
          description: "d",
          mediaType: MediaType.VIDEO,
          uploadType: UploadType.LINK,
          url: " http://y ",
        },
      ],
      "t1",
      "Event",
      { a: file("a.png") },
      uploadFn,
    );
    expect(out.map((m) => [m.url, m.isLocalFile])).toEqual([
      ["u/a.png", true],
      ["http://y", false],
    ]);
    expect(uploadFn).toHaveBeenCalledTimes(1);
  });

  it("arquivo ausente do 2º item: remove a linha gravada e apaga o upload do 1º", async () => {
    const { proc, repo } = setup();
    const discard = jest.fn(async () => undefined);
    await expect(
      proc.processMediaItemsPolymorphic(
        [upload("a"), upload("b")],
        "t1",
        "Event",
        { a: file("a.png") },
        async (f) => `u/${f.originalname}`,
        discard,
      ),
    ).rejects.toThrow('File missing for "b"');
    expect(repo.removeMany).toHaveBeenCalledTimes(1);
    expect(discard).toHaveBeenCalledWith("u/a.png");
  });

  it("falha ao gravar a linha: o objeto recém-enviado é apagado", async () => {
    const { proc, repo } = setup();
    repo.save.mockRejectedValueOnce(new Error("db"));
    const discard = jest.fn(async () => undefined);
    await expect(
      proc.processMediaItemsPolymorphic(
        [upload("a")],
        "t1",
        "Event",
        { a: file("a.png") },
        async () => "u/a.png",
        discard,
      ),
    ).rejects.toThrow("db");
    expect(discard).toHaveBeenCalledWith("u/a.png");
  });
});

describe("MediaItemProcessor.cleanAndReplaceMediaItems", () => {
  it("remove do S3 o arquivo local que saiu da lista e mantém o referenciado", async () => {
    const { proc, repo } = setup();
    const keep = Object.assign(new MediaItemEntity(), {
      url: "u/keep",
      isLocalFile: true,
      originalName: "k",
      size: 1,
    });
    const drop = Object.assign(new MediaItemEntity(), {
      url: "u/drop",
      isLocalFile: true,
    });
    const deleteFn = jest.fn(async () => undefined);
    const upsert = jest
      .spyOn(proc, "upsertMediaItem")
      .mockImplementation(async (_id, m) => m);
    const out = await proc.cleanAndReplaceMediaItems(
      [
        {
          title: "k",
          description: "d",
          mediaType: MediaType.IMAGE,
          uploadType: UploadType.UPLOAD,
          url: "u/keep",
        },
      ],
      "t1",
      "Event",
      {},
      [keep, drop],
      deleteFn,
      jest.fn(),
    );
    expect(deleteFn).toHaveBeenCalledTimes(1);
    expect(deleteFn).toHaveBeenCalledWith("u/drop");
    expect(repo.removeMany).toHaveBeenCalledWith([drop]);
    expect(out[0].url).toBe("u/keep");
    expect(upsert).toHaveBeenCalled();
  });
});

describe("MediaItemProcessor.removeMediaItemsKeepingFiles", () => {
  it("remove só as linhas e devolve as URLs dos arquivos locais (objeto só sai depois)", async () => {
    const { proc, repo } = setup();
    const local = Object.assign(new MediaItemEntity(), {
      url: "u/a",
      isLocalFile: true,
    });
    const link = Object.assign(new MediaItemEntity(), {
      url: "https://y",
      isLocalFile: false,
    });
    expect(await proc.removeMediaItemsKeepingFiles([local, link])).toEqual([
      "u/a",
    ]);
    expect(repo.removeMany).toHaveBeenCalledWith([local, link], undefined);
    expect(await proc.removeMediaItemsKeepingFiles([])).toEqual([]);
  });
});

describe("MediaItemProcessor: ordem linhas → objetos e compensação em cleanAndReplace", () => {
  it("deleteMediaItems/removeMediaItem removem a linha ANTES de apagar o objeto", async () => {
    const { proc, repo } = setup();
    const item = Object.assign(new MediaItemEntity(), {
      url: "u/a",
      isLocalFile: true,
    });
    const order: string[] = [];
    repo.removeMany.mockImplementation(async () => {
      order.push("row");
    });
    repo.removeOne.mockImplementation(async () => {
      order.push("row");
    });
    const del = jest.fn(async () => {
      order.push("object");
    });
    await proc.deleteMediaItems([item], del);
    await proc.removeMediaItem(item, del);
    expect(order).toEqual(["row", "object", "row", "object"]);
  });

  it("falha do banco na remoção não apaga o objeto", async () => {
    const { proc, repo } = setup();
    repo.removeMany.mockRejectedValue(new Error("db"));
    const del = jest.fn();
    await expect(
      proc.deleteMediaItems(
        [Object.assign(new MediaItemEntity(), { url: "u", isLocalFile: true })],
        del,
      ),
    ).rejects.toThrow("db");
    expect(del).not.toHaveBeenCalled();
  });

  it("cleanAndReplace: o objeto antigo só sai DEPOIS de gravar o novo", async () => {
    const { proc } = setup();
    const drop = Object.assign(new MediaItemEntity(), {
      url: "u/drop",
      isLocalFile: true,
    });
    const order: string[] = [];
    jest.spyOn(proc, "upsertMediaItem").mockImplementation(async (_i, m) => {
      order.push("save");
      return m;
    });
    const del = jest.fn(async () => {
      order.push("delete-old");
    });
    await proc.cleanAndReplaceMediaItems(
      [
        {
          title: "n",
          description: "d",
          mediaType: MediaType.IMAGE,
          uploadType: UploadType.UPLOAD,
          fileField: "f",
        },
      ],
      "t1",
      "Event",
      { f: file("n.png") },
      [drop],
      del,
      async () => "u/new",
    );
    expect(order).toEqual(["save", "delete-old"]);
    expect(del).toHaveBeenCalledWith("u/drop");
  });

  it("cleanAndReplace: falha ao gravar descarta o novo e NÃO apaga o antigo", async () => {
    const { proc } = setup();
    const drop = Object.assign(new MediaItemEntity(), {
      url: "u/drop",
      isLocalFile: true,
    });
    jest.spyOn(proc, "upsertMediaItem").mockRejectedValue(new Error("db"));
    const del = jest.fn(async () => undefined);
    await expect(
      proc.cleanAndReplaceMediaItems(
        [
          {
            title: "n",
            description: "d",
            mediaType: MediaType.IMAGE,
            uploadType: UploadType.UPLOAD,
            fileField: "f",
          },
        ],
        "t1",
        "Event",
        { f: file("n.png") },
        [drop],
        del,
        async () => "u/new",
      ),
    ).rejects.toThrow("db");
    expect(del).toHaveBeenCalledTimes(1);
    expect(del).toHaveBeenCalledWith("u/new");
  });
});

describe("MediaItemProcessor.discardUnreferencedUploads", () => {
  function build(referenced: string[]) {
    const repo = {
      findReferencedUrls: jest.fn(async () => new Set(referenced)),
    };
    return { repo, proc: new MediaItemProcessor(repo as never) };
  }

  it("apaga só o que nenhuma mídia referencia e preserva o resto", async () => {
    const { proc } = build(["u/kept"]);
    const del = jest.fn(async () => undefined);

    await proc.discardUnreferencedUploads(["u/kept", "u/orphan"], del);

    expect(del).toHaveBeenCalledTimes(1);
    expect(del).toHaveBeenCalledWith("u/orphan");
  });

  it("ignora vazios e duplicados e não consulta o banco sem URLs", async () => {
    const { proc, repo } = build([]);
    const del = jest.fn(async () => undefined);

    await proc.discardUnreferencedUploads(["", "u/a", "u/a"], del);
    await proc.discardUnreferencedUploads([], del);

    expect(del).toHaveBeenCalledTimes(1);
    expect(repo.findReferencedUrls).toHaveBeenCalledTimes(1);
  });

  it("tenta apagar todos e propaga o primeiro erro depois", async () => {
    const { proc } = build([]);
    const del = jest
      .fn<Promise<void>, [string]>()
      .mockRejectedValueOnce(new Error("s3 caiu"))
      .mockResolvedValue(undefined);

    await expect(
      proc.discardUnreferencedUploads(["u/1", "u/2"], del),
    ).rejects.toThrow("s3 caiu");
    expect(del).toHaveBeenCalledTimes(2);
  });
});
