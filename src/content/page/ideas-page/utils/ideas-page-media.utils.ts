import { BadRequestException } from "@nestjs/common";
import {
  MediaItemEntity,
  MediaType,
  UploadType,
} from "src/shared/media/media-item/media-item.entity";

export interface IdeasMediaInput {
  id?: string;
  title?: string;
  description?: string;
  mediaType?: MediaType;
  uploadType?: UploadType;
  isLocalFile?: boolean;
  url?: string;
  platformType?: MediaItemEntity["platformType"];
  originalName?: string;
  fieldKey?: string;
  size?: number | string;
}

export type MediaPlan =
  | { kind: "new-file"; input: IdeasMediaInput; file: Express.Multer.File }
  | { kind: "new-link"; input: IdeasMediaInput }
  | {
      kind: "replace-file";
      input: IdeasMediaInput;
      file: Express.Multer.File;
      existing: MediaItemEntity;
    }
  | { kind: "keep-file"; input: IdeasMediaInput; existing: MediaItemEntity }
  | { kind: "link"; input: IdeasMediaInput; existing: MediaItemEntity };

export function normalizeMediaType(type?: MediaType): MediaType {
  if (type === MediaType.VIDEO || type === MediaType.DOCUMENT) return type;
  return MediaType.IMAGE;
}

/** Decide o que fazer com um item de mídia recebido (puro; lança 400 se faltar arquivo). */
export function planMedia(
  input: IdeasMediaInput,
  existing: MediaItemEntity | undefined,
  filesDict: Record<string, Express.Multer.File>,
): MediaPlan {
  if (!existing) {
    const wantsFile =
      input.uploadType === UploadType.UPLOAD || input.isLocalFile === true;
    if (!wantsFile) return { kind: "new-link", input };
    if (!input.fieldKey) {
      throw new BadRequestException(
        `FieldKey missing for media "${input.title}"`,
      );
    }
    const file = filesDict[input.fieldKey];
    if (!file) {
      throw new BadRequestException(`File missing for media "${input.title}"`);
    }
    return { kind: "new-file", input, file };
  }

  const isUpload =
    input.uploadType === UploadType.UPLOAD && input.isLocalFile === true;
  const key = input.fieldKey ?? input.url;
  const file = key ? filesDict[key] : undefined;
  if (isUpload && file) return { kind: "replace-file", input, file, existing };
  if (isUpload) return { kind: "keep-file", input, existing };
  return { kind: "link", input, existing };
}

/** Campos de um item que aponta para link (sem arquivo no bucket). */
export function linkFields(
  input: IdeasMediaInput,
  base: Pick<
    MediaItemEntity,
    | "title"
    | "description"
    | "uploadType"
    | "platformType"
    | "mediaType"
    | "url"
    | "originalName"
    | "size"
  >,
): Partial<MediaItemEntity> {
  return {
    title: input.title || base.title,
    description: input.description || base.description,
    uploadType: input.uploadType || base.uploadType,
    platformType: input.platformType || base.platformType,
    mediaType: input.mediaType || base.mediaType,
    url: input.url?.trim() || base.url,
    originalName: input.originalName || base.originalName,
    size: input.size ? Number(input.size) : base.size,
    isLocalFile: false,
  };
}
