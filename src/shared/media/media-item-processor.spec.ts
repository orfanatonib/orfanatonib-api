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
