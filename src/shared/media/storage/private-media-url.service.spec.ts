import type { ConfigService } from "@nestjs/config";

import type { AwsS3Service } from "src/infrastructure/aws/services/aws-s3.service";
import { buildStorageKey, isPrivateStorageKey } from "./media-storage.utils";
import {
  PRIVATE_URL_DEFAULT_TTL_SECONDS,
  PRIVATE_URL_MAX_TTL_SECONDS,
  PRIVATE_URL_MIN_TTL_SECONDS,
  PrivateMediaUrlService,
  resolvePrivateUrlTtl,
} from "./private-media-url.service";

const BUCKET = "meu-bucket";
const privateKey = buildStorageKey({
  environment: "prod",
  entity: "AtendenteEstadual",
  ownerId: "a1",
  extension: "pdf",
  uuid: "u1",
  private: true,
});
const publicKey = buildStorageKey({
  environment: "prod",
  entity: "Foto",
  ownerId: "f1",
  extension: "png",
  uuid: "u2",
});

function setup(ttlEnv?: string) {
  const getSignedReadUrl = jest.fn((key: string, ttl: number) =>
    Promise.resolve(
      `https://signed.example/${key}?X-Amz-Expires=${ttl}&X-Amz-Signature=abc`,
    ),
  );
  const s3 = {
    getBucketName: () => BUCKET,
    getSignedReadUrl,
  } as unknown as AwsS3Service;
  const config = { get: () => ttlEnv } as unknown as ConfigService;
  return { service: new PrivateMediaUrlService(s3, config), getSignedReadUrl };
}

describe("chave privada", () => {
  it("fica sob <env>/private/ e é reconhecida; a pública não", () => {
    expect(privateKey).toBe("prod/private/AtendenteEstadual/a1/u1.pdf");
    expect(isPrivateStorageKey(privateKey)).toBe(true);
    expect(publicKey).toBe("prod/Foto/f1/u2.png");
    expect(isPrivateStorageKey(publicKey)).toBe(false);
    // Uma entidade chamada "private" não vira privada por engano (só o 2º segmento conta).
    expect(isPrivateStorageKey("prod/Foto/private/u.png")).toBe(false);
  });
});

describe("validade da URL assinada", () => {
  it("padrão 5 min, limitada entre 1 e 15 min", () => {
    expect(resolvePrivateUrlTtl(undefined)).toBe(
      PRIVATE_URL_DEFAULT_TTL_SECONDS,
    );
    expect(resolvePrivateUrlTtl("abc")).toBe(PRIVATE_URL_DEFAULT_TTL_SECONDS);
    expect(resolvePrivateUrlTtl("5")).toBe(PRIVATE_URL_MIN_TTL_SECONDS);
    expect(resolvePrivateUrlTtl("99999")).toBe(PRIVATE_URL_MAX_TTL_SECONDS);
    expect(resolvePrivateUrlTtl("600")).toBe(600);
  });
});

describe("PrivateMediaUrlService", () => {
  it("objeto privado: devolve URL assinada de curta duração, nunca o endereço permanente", async () => {
    const { service, getSignedReadUrl } = setup("120");
    const stored = `https://${BUCKET}.s3.amazonaws.com/${privateKey}`;
    const url = await service.resolve(stored);
    expect(getSignedReadUrl).toHaveBeenCalledWith(privateKey, 120);
    expect(url).toContain("X-Amz-Signature=");
    expect(url).not.toBe(stored);
  });

  it("funciona com endereço path-style (LocalStack)", async () => {
    const { service, getSignedReadUrl } = setup();
    await service.resolve(`http://localhost:4566/${BUCKET}/${privateKey}`);
    expect(getSignedReadUrl).toHaveBeenCalledWith(
      privateKey,
      PRIVATE_URL_DEFAULT_TTL_SECONDS,
    );
  });

  it("objeto público (legado) e URL de outra origem passam sem assinatura", async () => {
    const { service, getSignedReadUrl } = setup();
    const legacy = `https://${BUCKET}.s3.amazonaws.com/${publicKey}`;
    expect(await service.resolve(legacy)).toBe(legacy);
    expect(await service.resolve("https://youtube.com/watch?v=1")).toBe(
      "https://youtube.com/watch?v=1",
    );
    expect(getSignedReadUrl).not.toHaveBeenCalled();
  });

  it("withReadableUrl devolve uma cópia: a entidade original não muda", async () => {
    const { service } = setup();
    const media = {
      id: "m1",
      url: `https://${BUCKET}.s3.amazonaws.com/${privateKey}`,
    };
    const readable = await service.withReadableUrl(media);
    expect(readable?.url).toContain("X-Amz-Signature=");
    expect(media.url).toBe(`https://${BUCKET}.s3.amazonaws.com/${privateKey}`);
    expect(await service.withReadableUrl(undefined)).toBeUndefined();
    expect(await service.withReadableUrl(null)).toBeNull();
  });
});
