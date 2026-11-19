import { randomUUID } from "node:crypto";

import { MEDIA_UPLOAD_POLICIES } from "./media-storage.constants";
import { MediaType } from "../media-item/media-item.entity";

const SEGMENT_UNSAFE = /[^a-zA-Z0-9\-_]/g;

function safeSegment(value: string): string {
  return value.replace(SEGMENT_UNSAFE, "_");
}

/** Segmento de chave dos objetos PRIVADOS: a política do bucket nega leitura anônima de `<env>/private/*`. */
export const PRIVATE_KEY_SEGMENT = "private";

/**
 * Chave única: `<env>/<entidade>/<ownerId>/<uuid>.<ext>` (sem Date.now, sem colisão).
 * Documento sensível (ex.: antecedentes criminais) usa `private: true` ⇒ `<env>/private/<entidade>/...`
 * e só é lido por URL assinada de curta duração.
 */
export function buildStorageKey(params: {
  environment: string;
  entity: string;
  ownerId: string;
  extension: string;
  uuid?: string;
  private?: boolean;
}): string {
  const id = params.uuid ?? randomUUID();
  const env = safeSegment(params.environment);
  const scope = params.private ? `${env}/${PRIVATE_KEY_SEGMENT}` : env;
  return `${scope}/${safeSegment(params.entity)}/${safeSegment(params.ownerId)}/${id}.${params.extension}`;
}

/** A chave é de um objeto privado (`<env>/private/...`)? */
export function isPrivateStorageKey(key: string): boolean {
  return key.split("/")[1] === PRIVATE_KEY_SEGMENT;
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
  | { ok: false; reason: "mime" | "size" | "empty" | "content" };

/** Assinaturas (magic bytes) dos formatos que a política aceita e que têm assinatura estável. */
const SIGNATURES: Readonly<Record<string, readonly (readonly number[])[]>> = {
  "image/png": [[0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]],
  "image/jpeg": [[0xff, 0xd8, 0xff]],
  "image/gif": [
    [0x47, 0x49, 0x46, 0x38, 0x37, 0x61],
    [0x47, 0x49, 0x46, 0x38, 0x39, 0x61],
  ],
  "application/pdf": [[0x25, 0x50, 0x44, 0x46, 0x2d]],
};

const startsWith = (buffer: Buffer, signature: readonly number[]): boolean =>
  buffer.length >= signature.length &&
  signature.every((byte, index) => buffer[index] === byte);

/**
 * O `mimetype` vem do cliente: um HTML renomeado para `.png` chegaria ao bucket
 * como "image/png". Quando o conteúdo está disponível, os primeiros bytes têm de
 * bater com o formato declarado (WebP: RIFF…WEBP).
 */
export function contentMatchesMime(mimetype: string, buffer?: Buffer): boolean {
  if (!buffer) return true;
  if (mimetype === "image/webp") {
    return (
      buffer.length >= 12 &&
      buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
      buffer.subarray(8, 12).toString("ascii") === "WEBP"
    );
  }
  const signatures = SIGNATURES[mimetype];
  return !signatures || signatures.some((sig) => startsWith(buffer, sig));
}

export function validateUploadedFile(
  file: { mimetype: string; size: number; buffer?: Buffer },
  mediaType: MediaType,
): FileValidationResult {
  const policy = MEDIA_UPLOAD_POLICIES[mediaType];
  if (!file.size || file.size <= 0) return { ok: false, reason: "empty" };
  const extension = policy.allowed[file.mimetype];
  if (!extension) return { ok: false, reason: "mime" };
  if (file.size > policy.maxBytes) return { ok: false, reason: "size" };
  if (!contentMatchesMime(file.mimetype, file.buffer)) {
    return { ok: false, reason: "content" };
  }
  return { ok: true, extension, contentType: file.mimetype };
}
