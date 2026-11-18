import { ConfigService } from "@nestjs/config";

import {
  UploadScope,
  uploadScopeStorage,
} from "src/shared/media/storage/upload-scope";
import { AwsS3Service } from "./aws-s3.service";

const send = jest.fn();
jest.mock("@aws-sdk/client-s3", () => ({
  S3Client: jest.fn(() => ({ send })),
  PutObjectCommand: jest.fn((input: unknown) => ({ kind: "put", input })),
  DeleteObjectCommand: jest.fn((input: unknown) => ({ kind: "delete", input })),
  ListObjectsV2Command: jest.fn((input: unknown) => ({ kind: "list", input })),
  GetObjectCommand: jest.fn((input: unknown) => ({ kind: "get", input })),
}));

function make(env: Record<string, string> = {}) {
  const cfg = {
    get: (k: string) =>
      ({
        AWS_S3_BUCKET_NAME: "b",
        ENVIRONMENT: "local",
        AWS_ENDPOINT: "http://ls:4566",
        ...env,
      })[k],
  };
  return new AwsS3Service(cfg as unknown as ConfigService);
}

describe("AwsS3Service", () => {
  beforeEach(() => send.mockReset());

  it("upload legado: duas chamadas no mesmo ms geram chaves distintas (sem colisão)", async () => {
    send.mockResolvedValue({});
    jest.spyOn(Date, "now").mockReturnValue(1);
    const s = make();
    const f = {
      originalname: "a b.png",
      mimetype: "image/png",
      size: 1,
      buffer: Buffer.from("x"),
    } as Express.Multer.File;
    const [u1, u2] = [await s.upload(f), await s.upload(f)];
    expect(u1).not.toBe(u2);
    expect(u1).toMatch(
      /^http:\/\/ls:4566\/b\/local\/uploads\/[0-9a-f-]{36}_a_b\.png$/,
    );
  });

  it("upload legado recusa MIME fora da política e arquivo vazio, sem enviar nada", async () => {
    const s = make();
    const bad = {
      originalname: "x.exe",
      mimetype: "application/x-msdownload",
      size: 2,
      buffer: Buffer.from("MZ"),
    } as Express.Multer.File;
    const empty = {
      originalname: "a.png",
      mimetype: "image/png",
      size: 0,
      buffer: Buffer.alloc(0),
    } as Express.Multer.File;
    await expect(s.upload(bad)).rejects.toThrow("recusado");
    await expect(s.upload(empty)).rejects.toThrow("recusado");
    expect(send).not.toHaveBeenCalled();
  });

  it("dentro de um escopo de requisição, delete é adiado e upload é registrado", async () => {
    send.mockResolvedValue({});
    const s = make();
    const scope = new UploadScope();
    await uploadScopeStorage.run(scope, async () => {
      const url = await s.upload({
        originalname: "a.png",
        mimetype: "image/png",
        size: 1,
        buffer: Buffer.from("x"),
      } as Express.Multer.File);
      await s.delete("http://ls:4566/b/local/uploads/old.png");
      expect(scope.uploadedUrls).toEqual([url]);
    });
    expect(scope.deferredDeletes).toEqual([
      "http://ls:4566/b/local/uploads/old.png",
    ]);
    expect(send).toHaveBeenCalledTimes(1);
  });

  it("exclusão imediata que falha avisa o handler (fila de limpeza)", async () => {
    send.mockRejectedValue(new Error("denied"));
    const s = make();
    const handler = jest.fn().mockResolvedValue(undefined);
    s.setDeleteFailureHandler(handler);
    await s.delete("http://ls:4566/b/local/uploads/x.png");
    expect(handler).toHaveBeenCalledWith("local/uploads/x.png", "denied");
  });

  it("putObject devolve a URL e traduz falha", async () => {
    send.mockResolvedValueOnce({});
    expect(
      await make().putObject("k/1.png", Buffer.from("x"), "image/png"),
    ).toBe("http://ls:4566/b/k/1.png");
    send.mockRejectedValueOnce(new Error("x"));
    await expect(
      make().putObject("k", Buffer.from("x"), "image/png"),
    ).rejects.toThrow("Error uploading to S3");
  });

  it("deleteKey propaga a falha; delete legado continua engolindo (comportamento atual)", async () => {
    send.mockRejectedValue(new Error("denied"));
    await expect(make().deleteKey("k")).rejects.toThrow("denied");
    await expect(
      make().delete("http://ls:4566/b/local/uploads/x.png"),
    ).resolves.toBeUndefined();
  });

  it("delete legado com URL sem chave não chama o S3", async () => {
    await make().delete("https://youtube.com/x");
    expect(send).not.toHaveBeenCalled();
  });

  it("listKeys percorre as páginas", async () => {
    send
      .mockResolvedValueOnce({
        Contents: [{ Key: "a", LastModified: new Date(0) }],
        IsTruncated: true,
        NextContinuationToken: "t",
      })
      .mockResolvedValueOnce({ Contents: [{ Key: "b" }], IsTruncated: false });
    const keys = await make().listKeys("local/");
    expect(keys.map((k) => k.key)).toEqual(["a", "b"]);
  });

  describe("downloadOwned", () => {
    const owned = "http://ls:4566/b/local/uploads/a.png";

    it("lê o objeto do próprio bucket pela chave extraída da URL", async () => {
      send.mockResolvedValue({
        ContentLength: 3,
        Body: (async function* () {
          yield Buffer.from("abc");
        })(),
      });

      const buffer = await make().downloadOwned(owned, 10);

      expect(buffer.toString()).toBe("abc");
      expect(send).toHaveBeenCalledWith({
        kind: "get",
        input: { Bucket: "b", Key: "local/uploads/a.png" },
      });
    });

    it("recusa URL de outra origem sem chamar o S3 (SSRF)", async () => {
      await expect(
        make().downloadOwned("https://evil.example/x.png", 10),
      ).rejects.toThrow("não pertence ao bucket");
      expect(send).not.toHaveBeenCalled();
    });

    it("recusa objeto maior que o limite pelo ContentLength, sem ler o corpo", async () => {
      const body = (async function* () {
        yield Buffer.from("x");
      })();
      send.mockResolvedValue({ ContentLength: 11, Body: body });

      await expect(make().downloadOwned(owned, 10)).rejects.toThrow(
        "excede o limite",
      );
    });

    it("recusa corpo que passa do limite mesmo sem ContentLength", async () => {
      send.mockResolvedValue({
        Body: (async function* () {
          yield Buffer.from("123456");
          yield Buffer.from("78901");
        })(),
      });

      await expect(make().downloadOwned(owned, 10)).rejects.toThrow(
        "excede o limite",
      );
    });
  });
});
