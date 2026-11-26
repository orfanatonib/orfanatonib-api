import { MediaType } from "../media-item/media-item.entity";
import type { MediaReferenceColumn } from "./media-storage.types";

const MB = 1024 * 1024;

export interface MediaUploadPolicy {
  maxBytes: number;
  /** MIME aceito => extensão canônica usada na chave e no ContentType. */
  allowed: Readonly<Record<string, string>>;
}

export const MEDIA_UPLOAD_POLICIES: Readonly<
  Record<MediaType, MediaUploadPolicy>
> = {
  [MediaType.IMAGE]: {
    maxBytes: 10 * MB,
    allowed: {
      "image/jpeg": "jpg",
      "image/png": "png",
      "image/webp": "webp",
      "image/gif": "gif",
    },
  },
  [MediaType.VIDEO]: {
    maxBytes: 200 * MB,
    allowed: {
      "video/mp4": "mp4",
      "video/webm": "webm",
      "video/quicktime": "mov",
    },
  },
  [MediaType.DOCUMENT]: {
    maxBytes: 25 * MB,
    allowed: {
      "application/pdf": "pdf",
      "application/msword": "doc",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
        "docx",
      "application/vnd.ms-powerpoint": "ppt",
      "application/vnd.openxmlformats-officedocument.presentationml.presentation":
        "pptx",
      "application/vnd.ms-excel": "xls",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":
        "xlsx",
    },
  },
  [MediaType.AUDIO]: {
    maxBytes: 50 * MB,
    allowed: { "audio/mpeg": "mp3", "audio/mp4": "m4a", "audio/wav": "wav" },
  },
};

export const MEDIA_CLEANUP_MAX_ATTEMPTS = 5;
export const MEDIA_RECONCILIATION_MIN_AGE_HOURS = 24;

/**
 * Toda coluna, além de `media_items`, que aponta para um arquivo do bucket. Quem decide apagar arquivo
 * (reconciliação e descarte de upload) consulta TODAS; coluna fora daqui vira arquivo apagado em uso.
 * `media-columns.architecture.spec.ts` falha se uma entidade ganhar coluna de mídia que não esteja listada.
 */
export const MEDIA_URL_REFERENCE_COLUMNS: ReadonlyArray<MediaReferenceColumn> =
  [
    { table: "routes", column: "image" },
    { table: "content_packages", column: "coverImageUrl" },
    { table: "lessons", column: "cover_image_url" },
  ];

/** Colunas que guardam a chave do objeto (ou, em registros antigos, a própria URL). */
export const MEDIA_KEY_REFERENCE_COLUMNS: ReadonlyArray<MediaReferenceColumn> =
  [
    { table: "content_assets", column: "storageKey" },
    { table: "lesson_versions", column: "docxS3Key" },
    { table: "lesson_versions", column: "pdfS3Key" },
  ];
