import { randomUUID } from "node:crypto";

import { MEDIA_UPLOAD_POLICIES } from "./media-storage.constants";
import { MediaType } from "../media-item/media-item.entity";

const SEGMENT_UNSAFE = /[^a-zA-Z0-9\-_]/g;

function safeSegment(value: string): string {
  return value.replace(SEGMENT_UNSAFE, "_");
}

/** Chave única: `<env>/<entidade>/<ownerId>/<uuid>.<ext>` (sem Date.now, sem colisão). */
export function buildStorageKey(params: {
  environment: string;
  entity: string;
  ownerId: string;
  extension: string;
  uuid?: string;
}): string {
  const id = params.uuid ?? randomUUID();
  return `${safeSegment(params.environment)}/${safeSegment(params.entity)}/${safeSegment(params.ownerId)}/${id}.${params.extension}`;
}

/** Extrai a chave de uma URL gravada (virtual-hosted ou path-style). Null se não der. */
export function extractStorageKey(url: string, bucket: string): string | null {
  const virtual = url.split(`${bucket}.s3.amazonaws.com/`)[1];
  if (virtual) return virtual;
  const pathStyle = url.split(`/${bucket}/`)[1];
  return pathStyle ? pathStyle : null;
}

export type FileValidationResult =
  | { ok: true; extension: string; contentType: string }
  | { ok: false; reason: "mime" | "size" | "empty" };

export function validateUploadedFile(
  file: { mimetype: string; size: number },
  mediaType: MediaType,
): FileValidationResult {
  const policy = MEDIA_UPLOAD_POLICIES[mediaType];
  if (!file.size || file.size <= 0) return { ok: false, reason: "empty" };
  const extension = policy.allowed[file.mimetype];
  if (!extension) return { ok: false, reason: "mime" };
  if (file.size > policy.maxBytes) return { ok: false, reason: "size" };
  return { ok: true, extension, contentType: file.mimetype };
}
