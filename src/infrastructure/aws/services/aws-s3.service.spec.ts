import { BadRequestException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import {
  UploadScope,
  uploadScopeStorage,
} from "src/shared/media/storage/upload-scope";

import { AwsS3Service } from "./aws-s3.service";

const send = jest.fn();
jest.mock("@aws-sdk/client-s3", () => {
  class Cmd {
    constructor(public readonly input: Record<string, unknown>) {}
  }
  return {
    S3Client: jest.fn().mockImplementation(() => ({ send })),
    PutObjectCommand: class PutObjectCommand extends Cmd {},
    DeleteObjectCommand: class DeleteObjectCommand extends Cmd {},
    GetObjectCommand: class GetObjectCommand extends Cmd {},
    ListObjectsV2Command: class ListObjectsV2Command extends Cmd {},
  };
});

const BUCKET = "bucket-teste";
const ENDPOINT = "http://localhost:4566";

function build(env: Record<string, string> = {}): AwsS3Service {
  const config = {
    AWS_S3_BUCKET_NAME: BUCKET,
    AWS_ENDPOINT: ENDPOINT,
    ENVIRONMENT: "local",
    ...env,
  };
  return new AwsS3Service({
    get: (key: string) => config[key as keyof typeof config],
  } as unknown as ConfigService);
}

const png = (name = "Foto da Criança (1).png"): Express.Multer.File =>
  ({
    originalname: name,
    mimetype: "image/png",
    size: 4,
    // assinatura PNG: o validador confere os bytes, não só o mimetype
    buffer: Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  }) as Express.Multer.File;

beforeEach(() => {
  send.mockReset().mockResolvedValue({});
});

describe("AwsS3Service.upload", () => {
  it("grava com chave <env>/uploads/<uuid>_<nome saneado> e devolve a URL do endpoint", async () => {
    const url = await build().upload(png());
    const key = (
      (send.mock.calls as unknown[][])[0][0] as { input: { Key: string } }
    ).input.Key;
    expect(key).toMatch(
      /^local\/uploads\/[0-9a-f-]{36}_Foto_da_Crian_a__1_.png$/,
    );
    expect(url).toBe(`${ENDPOINT}/${BUCKET}/${key}`);
  });

  it("[media-upload.legacy.aws-s3#chave-unica-sem-colisao] dois uploads do mesmo nome nunca colidem na chave", async () => {
    const svc = build();
    const a = await svc.upload(png("a.png"));
    const b = await svc.upload(png("a.png"));
    expect(a).not.toBe(b);
  });

  it("sem endpoint usa a URL virtual-hosted da AWS", async () => {
    const svc = build({ AWS_ENDPOINT: "", AWS_S3_ENDPOINT: "" });
    const url = await svc.upload(png("a.png"));
    expect(url).toMatch(
      new RegExp(`^https://${BUCKET}\\.s3\\.amazonaws\\.com/local/uploads/`),
    );
  });

  it("[media-upload.legacy.aws-s3#mime-x-conteudo-recusado] arquivo recusado pela política (MIME x conteúdo) é 400 e nada vai ao bucket", async () => {
    const fake = {
      ...png("x.png"),
      buffer: Buffer.from("isto não é um png"),
    } as Express.Multer.File;
    await expect(build().upload(fake)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(send).not.toHaveBeenCalled();
  });

  it("falha do S3 vira erro genérico (sem vazar a mensagem do SDK)", async () => {
    send.mockRejectedValue(new Error("AccessDenied: segredo interno"));
    await expect(build().upload(png("a.png"))).rejects.toThrow(
      "Error uploading to S3",
    );
  });

  it("dentro de uma requisição o upload é lembrado no escopo (para descarte se ela falhar)", async () => {
    const scope = new UploadScope();
    const url = await uploadScopeStorage.run(scope, () =>
      build().upload(png("a.png")),
    );
    expect(scope.uploadedUrls).toEqual([url]);
  });
});

describe("AwsS3Service.delete", () => {
  it("[media-upload.legacy.aws-s3#exclusao-adiada-no-escopo] dentro de uma requisição a exclusão é ADIADA (nada vai ao S3 agora)", async () => {
    const scope = new UploadScope();
    await uploadScopeStorage.run(scope, () =>
      build().delete(`${ENDPOINT}/${BUCKET}/local/uploads/a.png`),
    );
    expect(scope.deferredDeletes).toEqual([
      `${ENDPOINT}/${BUCKET}/local/uploads/a.png`,
    ]);
    expect(send).not.toHaveBeenCalled();
  });

  it.each([
    [`${ENDPOINT}/${BUCKET}/local/uploads/a.png`, "local/uploads/a.png"],
    [
      `https://${BUCKET}.s3.amazonaws.com/local/uploads/b.png`,
      "local/uploads/b.png",
    ],
  ])("fora de requisição extrai a chave de %s e apaga", async (url, key) => {
    await build().delete(url);
    expect(
      ((send.mock.calls as unknown[][])[0][0] as { input: { Key: string } })
        .input.Key,
    ).toBe(key);
  });

  it("[media-upload.legacy.aws-s3#url-de-outra-origem-e-erro] URL de outra origem não apaga nada e é registrada como ERRO (não só aviso)", async () => {
    const svc = build();
    const error = jest
      .spyOn(svc["logger"], "error")
      .mockImplementation(() => undefined);
    await svc.delete("https://outro-site.com/foto.png");
    expect(send).not.toHaveBeenCalled();
    expect(error).toHaveBeenCalled();
  });

  it("[media-upload.legacy.aws-s3#falha-de-exclusao-vai-para-fila] exclusão que falha vai para o handler da fila de limpeza com a chave e o motivo", async () => {
    const svc = build();
    const handler = jest.fn().mockResolvedValue(undefined);
    svc.setDeleteFailureHandler(handler);
    send.mockRejectedValue(new Error("timeout"));
    await svc.delete(`${ENDPOINT}/${BUCKET}/local/uploads/c.png`);
    expect(handler).toHaveBeenCalledWith("local/uploads/c.png", "timeout");
  });
});

describe("AwsS3Service.keyFromOwnedUrl / downloadOwned", () => {
  it("só reconhece URL do NOSSO bucket", () => {
    const svc = build();
    expect(svc.keyFromOwnedUrl(`${ENDPOINT}/${BUCKET}/a/b%20c.png?x=1`)).toBe(
      "a/b c.png",
    );
    expect(svc.keyFromOwnedUrl("https://evil.com/a.png")).toBeNull();
  });

  it("[media-upload.legacy.aws-s3#ssrf-download-recusado] recusa baixar URL de outra origem (SSRF) sem chamar o S3", async () => {
    await expect(
      build().downloadOwned("https://evil.com/a.png", 100),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(send).not.toHaveBeenCalled();
  });

  it("recusa objeto maior que o limite pelo ContentLength, sem ler o corpo", async () => {
    send.mockResolvedValue({ ContentLength: 500, Body: undefined });
    await expect(
      build().downloadOwned(`${ENDPOINT}/${BUCKET}/a.png`, 100),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
