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
