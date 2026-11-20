import {
  CONTENT_PUBLICATION_FIELD_KEY_PREFIX,
  CONTENT_PUBLICATION_STALE_AFTER_MS,
  MYSQL_DUPLICATE_ENTRY_CODE,
} from "../constants/content-publication.constants";
import type { ContentPublicationEntity } from "../entities/content-publication.entity";
import { ContentPublicationStatus } from "../enums/content-publication-status.enum";
import type {
  PublicationDocumentFile,
  PublicationTrackSnapshot,
} from "../content-publication.types";

/** True for the MySQL unique-key violation (driver error shape: `code`/`errno 1062`). */
export function isDuplicateKeyError(error: unknown): boolean {
  if (typeof error !== "object" || error === null) return false;
  const candidate = error as {
    code?: unknown;
    errno?: unknown;
    driverError?: unknown;
  };
  if (candidate.code === MYSQL_DUPLICATE_ENTRY_CODE || candidate.errno === 1062)
    return true;
  return (
    candidate.driverError !== undefined &&
    isDuplicateKeyError(candidate.driverError)
  );
}

/** A PUBLISHING row nobody finished (crash, restart): must be reconciled instead of waited for. */
export function isPublicationStale(
  publication: Pick<ContentPublicationEntity, "status" | "updatedAt">,
  now: Date = new Date(),
): boolean {
  return (
    publication.status === ContentPublicationStatus.PUBLISHING &&
    now.getTime() - publication.updatedAt.getTime() >
      CONTENT_PUBLICATION_STALE_AFTER_MS
  );
}

/** Publications that still need reconciliation by `sourceLessonId`. */
export function needsReconciliation(
  publication: Pick<ContentPublicationEntity, "status" | "updatedAt">,
  now: Date = new Date(),
): boolean {
  return (
    publication.status === ContentPublicationStatus.UNCERTAIN ||
    isPublicationStale(publication, now)
  );
}

export function describeTrackAges(track: PublicationTrackSnapshot): string {
  return track.maximumAge === null
    ? `a partir de ${track.minimumAge} anos`
    : `${track.minimumAge} a ${track.maximumAge} anos`;
}

/** Stable, ASCII-only multipart field name for the n-th generated document. */
export function documentFieldKey(index: number): string {
  return `${CONTENT_PUBLICATION_FIELD_KEY_PREFIX}-${index + 1}`;
}

/** Synthetic multer file built from a rendered buffer (no disk, no request). */
export function toSyntheticMulterFile(
  fieldKey: string,
  document: PublicationDocumentFile,
): Express.Multer.File {
  return {
    fieldname: fieldKey,
    originalname: document.fileName,
    encoding: "7bit",
    mimetype: document.contentType,
    size: document.buffer.length,
    buffer: document.buffer,
  } as Express.Multer.File;
}
