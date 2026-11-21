import { BadRequestException } from "@nestjs/common";
import { MediaItemDto } from "src/shared/dto/media-item-dto";
import {
  MediaItemEntity,
  MediaType,
  UploadType,
} from "src/shared/media/media-item/media-item.entity";
import {
  EBML_SIGNATURE,
  ISO_BMFF_BOX_TYPES,
  SHELTER_POST_IMAGE_FORMATS,
  SHELTER_POST_MAX_IMAGE_BYTES,
  SHELTER_POST_MAX_PHOTOS,
  SHELTER_POST_MAX_VIDEOS,
  SHELTER_POST_MAX_VIDEO_BYTES,
  SHELTER_POST_MESSAGES,
  SHELTER_POST_VIDEO_FORMATS,
} from "./constants";

type UploadedFilesDict = Record<string, Express.Multer.File>;

const reject = (message: string): never => {
  throw new BadRequestException({
    message,
    category: "RULE",
    details: { code: "IMAGE_SECTION_MEDIA_INVALID" },
  });
};

const extensionOf = (name: string): string =>
  name.split(".").pop()?.toLowerCase() ?? "";

/** Primeiros bytes coerentes com o contêiner declarado (vídeo; foto já é checada no armazenamento). */
export function videoSignatureMatches(
  mimetype: string,
  buffer: Buffer | undefined,
): boolean {
  if (!buffer || buffer.length < 12) return false;
  if (mimetype === "video/webm") {
    return EBML_SIGNATURE.every((byte, index) => buffer[index] === byte);
  }
  const box = buffer.toString("ascii", 4, 8);
  return (ISO_BMFF_BOX_TYPES as readonly string[]).includes(box);
}

/**
 * Valida a seleção inteira ANTES de qualquer upload: de 1 a 10 fotos e no máximo
 * 1 vídeo no mesmo post, cada arquivo com o tipo declarado, extensão, tamanho e
 * conteúdo corretos. `existing` (edição) tolera álbuns antigos com mais fotos.
 */
export function validateShelterPostMedia(
  items: MediaItemDto[],
  files: UploadedFilesDict,
  existing: Pick<MediaItemEntity, "id" | "mediaType">[] = [],
): void {
  if (!items.length) reject(SHELTER_POST_MESSAGES.EMPTY);
  if (
    items.some(
      (item) =>
        item.mediaType !== MediaType.IMAGE &&
        item.mediaType !== MediaType.VIDEO,
    )
  ) {
    reject(SHELTER_POST_MESSAGES.COMPOSITION);
  }
  const videos = items.filter(
    (item) => item.mediaType === MediaType.VIDEO,
  ).length;
  const photos = items.length - videos;
  const photoLimit = Math.max(
    SHELTER_POST_MAX_PHOTOS,
    existing.filter((media) => media.mediaType === MediaType.IMAGE).length,
  );
  if (videos > SHELTER_POST_MAX_VIDEOS)
    reject(SHELTER_POST_MESSAGES.TOO_MANY_VIDEOS);
  if (photos > photoLimit) reject(SHELTER_POST_MESSAGES.TOO_MANY_PHOTOS);

  const usedFields = new Set<string>();
  for (const item of items) {
    const isVideo = item.mediaType === MediaType.VIDEO;
    const stored = item.id
      ? existing.find((media) => media.id === item.id)
      : undefined;
    // Vídeo novo só por arquivo (como no Clubinho): link de vídeo não é aceito.
    if (item.uploadType !== UploadType.UPLOAD) {
      if (isVideo && !stored) reject(SHELTER_POST_MESSAGES.VIDEO_INVALID);
      continue;
    }
    const file = item.fieldKey ? files[item.fieldKey] : undefined;
    if (!file) {
      // Sem arquivo novo só vale a mídia que já está gravada (edição do admin).
      if (!stored) reject(SHELTER_POST_MESSAGES.FILE_MISSING);
      continue;
    }
    if (usedFields.has(file.fieldname))
      reject(SHELTER_POST_MESSAGES.FILE_REPEATED);
    usedFields.add(file.fieldname);

    const formats = isVideo
      ? SHELTER_POST_VIDEO_FORMATS
      : SHELTER_POST_IMAGE_FORMATS;
    const maxBytes = isVideo
      ? SHELTER_POST_MAX_VIDEO_BYTES
      : SHELTER_POST_MAX_IMAGE_BYTES;
    const extension = extensionOf(file.originalname);
    const typeOk = Boolean(formats[file.mimetype]?.includes(extension));
    const sizeOk = file.size > 0 && file.size <= maxBytes;
    const contentOk =
      !isVideo || videoSignatureMatches(file.mimetype, file.buffer);
    if (!typeOk || !sizeOk || !contentOk) {
      reject(
        isVideo
          ? SHELTER_POST_MESSAGES.VIDEO_INVALID
          : SHELTER_POST_MESSAGES.PHOTO_INVALID,
      );
    }
  }
  if (Object.keys(files).some((key) => !usedFields.has(key))) {
    reject(SHELTER_POST_MESSAGES.FILE_UNLINKED);
  }
}
