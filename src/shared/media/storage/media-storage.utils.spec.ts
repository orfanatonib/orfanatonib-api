import { MediaType } from "../media-item/media-item.entity";
import {
  buildStorageKey,
  extractStorageKey,
  validateUploadedFile,
} from "./media-storage.utils";

describe("media-storage.utils", () => {
  it("buildStorageKey: chaves distintas mesmo com tudo igual", () => {
    const p = {
      environment: "local",
      entity: "Event",
      ownerId: "o1",
      extension: "jpg",
    };
    expect(buildStorageKey(p)).not.toBe(buildStorageKey(p));
    expect(buildStorageKey({ ...p, uuid: "u" })).toBe("local/Event/o1/u.jpg");
  });

  it("buildStorageKey: sanitiza segmentos (sem path traversal)", () => {
    const k = buildStorageKey({
      environment: "l",
      entity: "../x",
      ownerId: "a/b",
      extension: "png",
      uuid: "u",
    });
    expect(k).toBe("l/___x/a_b/u.png");
  });

  it("extractStorageKey: virtual-hosted, path-style e inválida", () => {
    expect(
      extractStorageKey("https://b.s3.amazonaws.com/l/e/o/u.jpg", "b"),
    ).toBe("l/e/o/u.jpg");
    expect(extractStorageKey("http://localhost:4566/b/l/e/o/u.jpg", "b")).toBe(
      "l/e/o/u.jpg",
    );
    expect(extractStorageKey("https://youtube.com/x", "b")).toBeNull();
  });

  it("validateUploadedFile: aceita, recusa MIME, tamanho e vazio", () => {
    expect(
      validateUploadedFile(
        { mimetype: "image/png", size: 10 },
        MediaType.IMAGE,
      ),
    ).toEqual({
      ok: true,
      extension: "png",
      contentType: "image/png",
    });
    expect(
      validateUploadedFile(
        { mimetype: "text/html", size: 10 },
        MediaType.IMAGE,
      ),
    ).toEqual({ ok: false, reason: "mime" });
    expect(
      validateUploadedFile(
        { mimetype: "image/png", size: 11 * 1024 * 1024 },
        MediaType.IMAGE,
      ),
    ).toEqual({ ok: false, reason: "size" });
    expect(
      validateUploadedFile({ mimetype: "image/png", size: 0 }, MediaType.IMAGE),
    ).toEqual({ ok: false, reason: "empty" });
    expect(
      validateUploadedFile(
        { mimetype: "application/pdf", size: 5 },
        MediaType.IMAGE,
      ),
    ).toEqual({ ok: false, reason: "mime" });
  });
});

describe("validateUploadedFile: conteúdo × MIME declarado", () => {
  const PNG = Buffer.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0,
  ]);
  const html = Buffer.from("<html><script>alert(1)</script></html>");

  it("aceita quando os primeiros bytes batem com o formato", () => {
    expect(
      validateUploadedFile(
        { mimetype: "image/png", size: PNG.length, buffer: PNG },
        MediaType.IMAGE,
      ),
    ).toMatchObject({ ok: true, extension: "png" });
    expect(
      validateUploadedFile(
        {
          mimetype: "application/pdf",
          size: 9,
          buffer: Buffer.from("%PDF-1.7 "),
        },
        MediaType.DOCUMENT,
      ),
    ).toMatchObject({ ok: true });
  });

  it("recusa HTML disfarçado de imagem ou PDF (content)", () => {
    expect(
      validateUploadedFile(
        { mimetype: "image/png", size: html.length, buffer: html },
        MediaType.IMAGE,
      ),
    ).toEqual({ ok: false, reason: "content" });
    expect(
      validateUploadedFile(
        { mimetype: "application/pdf", size: html.length, buffer: html },
        MediaType.DOCUMENT,
      ),
    ).toEqual({ ok: false, reason: "content" });
  });

  it("WebP exige RIFF…WEBP; JPEG e GIF pela assinatura", () => {
    const webp = Buffer.concat([
      Buffer.from("RIFF"),
      Buffer.from([1, 0, 0, 0]),
      Buffer.from("WEBP"),
    ]);
    expect(
      validateUploadedFile(
        { mimetype: "image/webp", size: 12, buffer: webp },
        MediaType.IMAGE,
      ).ok,
    ).toBe(true);
    expect(
      validateUploadedFile(
        { mimetype: "image/webp", size: 12, buffer: html },
        MediaType.IMAGE,
      ).ok,
    ).toBe(false);
    expect(
      validateUploadedFile(
        {
          mimetype: "image/jpeg",
          size: 4,
          buffer: Buffer.from([0xff, 0xd8, 0xff, 0xe0]),
        },
        MediaType.IMAGE,
      ).ok,
    ).toBe(true);
    expect(
      validateUploadedFile(
        { mimetype: "image/gif", size: 6, buffer: Buffer.from("GIF89a") },
        MediaType.IMAGE,
      ).ok,
    ).toBe(true);
  });

  it("sem buffer (chamadas antigas) a checagem de conteúdo é ignorada", () => {
    expect(
      validateUploadedFile({ mimetype: "image/png", size: 10 }, MediaType.IMAGE)
        .ok,
    ).toBe(true);
  });
});
