import { MediaType } from "../media-item/media-item.entity";

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
