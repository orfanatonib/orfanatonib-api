import { BadRequestException } from "@nestjs/common";
import { MediaItemDto } from "src/shared/dto/media-item-dto";
import {
  MediaType,
  UploadType,
} from "src/shared/media/media-item/media-item.entity";
import {
  IMAGE_SECTION_UPLOAD_LIMITS,
  SHELTER_POST_MAX_VIDEO_BYTES,
  SHELTER_POST_MESSAGES,
} from "./constants";
import { validateShelterPostMedia } from "./media-validation";

const photo = (key: string): MediaItemDto => ({
  mediaType: MediaType.IMAGE,
  uploadType: UploadType.UPLOAD,
  isLocalFile: true,
  fieldKey: key,
  originalName: `${key}.png`,
});
const video = (key = "vid"): MediaItemDto => ({
  mediaType: MediaType.VIDEO,
  uploadType: UploadType.UPLOAD,
  isLocalFile: true,
  fieldKey: key,
  originalName: `${key}.mp4`,
});
const png = (key: string): Express.Multer.File =>
  ({
    fieldname: key,
    originalname: `${key}.png`,
    mimetype: "image/png",
    size: 16,
    buffer: Buffer.alloc(16),
  }) as Express.Multer.File;
const mp4 = (key = "vid", extra: Partial<Express.Multer.File> = {}) =>
  ({
    fieldname: key,
    originalname: `${key}.mp4`,
    mimetype: "video/mp4",
    size: 16,
    buffer: Buffer.from([0, 0, 0, 16, 102, 116, 121, 112, 105, 115, 111, 109, 0, 0, 0, 0]),
    ...extra,
  }) as Express.Multer.File;

const messageOf = (fn: () => void): string => {
  try {
    fn();
  } catch (error) {
    expect(error).toBeInstanceOf(BadRequestException);
    return JSON.stringify((error as BadRequestException).getResponse());
  }
  throw new Error("não rejeitou");
};

describe("validateShelterPostMedia (fotos e vídeo no mesmo post)", () => {
  it("aceita 2 fotos + 1 vídeo no mesmo post", () => {
    expect(() =>
      validateShelterPostMedia([photo("a"), photo("b"), video()], {
        a: png("a"),
        b: png("b"),
        vid: mp4(),
      }),
    ).not.toThrow();
  });

  it("aceita só fotos, só vídeo e vídeo MOV/WebM", () => {
    expect(() =>
      validateShelterPostMedia([photo("a")], { a: png("a") }),
    ).not.toThrow();
    expect(() =>
      validateShelterPostMedia([video()], { vid: mp4() }),
    ).not.toThrow();
    const mov = mp4("vid", { originalname: "x.mov", mimetype: "video/quicktime" });
    expect(() => validateShelterPostMedia([video()], { vid: mov })).not.toThrow();
    const webm = mp4("vid", {
      originalname: "x.webm",
      mimetype: "video/webm",
      buffer: Buffer.from([0x1a, 0x45, 0xdf, 0xa3, 0, 0, 0, 0, 0, 0, 0, 0]),
    });
    expect(() => validateShelterPostMedia([video()], { vid: webm })).not.toThrow();
  });

  it("recusa post vazio, 2 vídeos e mais de 10 fotos", () => {
    expect(messageOf(() => validateShelterPostMedia([], {}))).toContain(
      SHELTER_POST_MESSAGES.EMPTY,
    );
    expect(
      messageOf(() =>
        validateShelterPostMedia([video("v1"), video("v2")], {
          v1: mp4("v1"),
          v2: mp4("v2"),
        }),
      ),
    ).toContain(SHELTER_POST_MESSAGES.TOO_MANY_VIDEOS);
    const keys = Array.from({ length: 11 }, (_, i) => `p${i}`);
    expect(
      messageOf(() =>
        validateShelterPostMedia(
          keys.map(photo),
          Object.fromEntries(keys.map((k) => [k, png(k)])),
        ),
      ),
    ).toContain(SHELTER_POST_MESSAGES.TOO_MANY_PHOTOS);
  });

  it("recusa tipo de mídia fora de foto/vídeo", () => {
    expect(
      messageOf(() =>
        validateShelterPostMedia(
          [{ ...photo("a"), mediaType: MediaType.DOCUMENT }],
          { a: png("a") },
        ),
      ),
    ).toContain(SHELTER_POST_MESSAGES.COMPOSITION);
  });

  it.each([
    ["extensão errada", { originalname: "v.exe" }],
    ["MIME errado", { mimetype: "application/pdf" }],
    ["vazio", { size: 0 }],
    ["grande demais", { size: SHELTER_POST_MAX_VIDEO_BYTES + 1 }],
    ["conteúdo que não é vídeo", { buffer: Buffer.alloc(16) }],
  ])("recusa vídeo inválido: %s", (_nome, patch) => {
    expect(
      messageOf(() =>
        validateShelterPostMedia([video()], { vid: mp4("vid", patch) }),
      ),
    ).toContain(SHELTER_POST_MESSAGES.VIDEO_INVALID);
  });

  it("recusa foto declarada com arquivo de vídeo e foto > 10 MB", () => {
    expect(
      messageOf(() =>
        validateShelterPostMedia([photo("a")], { a: mp4("a") }),
      ),
    ).toContain(SHELTER_POST_MESSAGES.PHOTO_INVALID);
    expect(
      messageOf(() =>
        validateShelterPostMedia([photo("a")], {
          a: { ...png("a"), size: 10 * 1024 * 1024 + 1 } as Express.Multer.File,
        }),
      ),
    ).toContain(SHELTER_POST_MESSAGES.PHOTO_INVALID);
  });

  it("recusa upload sem arquivo e arquivo sem vínculo", () => {
    expect(
      messageOf(() => validateShelterPostMedia([photo("a")], {})),
    ).toContain(SHELTER_POST_MESSAGES.FILE_MISSING);
    expect(
      messageOf(() =>
        validateShelterPostMedia([photo("a")], { a: png("a"), extra: png("extra") }),
      ),
    ).toContain(SHELTER_POST_MESSAGES.FILE_UNLINKED);
  });

  it("recusa vídeo novo por link; admin mantém mídia já gravada (id) sem reenviar arquivo", () => {
    const link: MediaItemDto = {
      mediaType: MediaType.VIDEO,
      uploadType: UploadType.LINK,
      isLocalFile: false,
      url: "https://youtu.be/x",
    };
    expect(messageOf(() => validateShelterPostMedia([link], {}))).toContain(
      SHELTER_POST_MESSAGES.VIDEO_INVALID,
    );
    const kept: MediaItemDto = { ...video(), id: "m1", fieldKey: undefined };
    expect(() =>
      validateShelterPostMedia([kept], {}, [{ id: "m1", mediaType: MediaType.VIDEO }]),
    ).not.toThrow();
  });
});

describe("limites do multer", () => {
  it("fotos + vídeo e o vídeo é o maior arquivo", () => {
    expect(IMAGE_SECTION_UPLOAD_LIMITS.files).toBe(11);
    expect(IMAGE_SECTION_UPLOAD_LIMITS.fileSize).toBe(SHELTER_POST_MAX_VIDEO_BYTES);
    expect(IMAGE_SECTION_UPLOAD_LIMITS.fileSize).toBeLessThanOrEqual(200 * 1024 * 1024);
  });
});
