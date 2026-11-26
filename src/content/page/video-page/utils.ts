import { MediaItemEntity } from "src/shared/media/media-item/media-item.entity";

export function requestedMediaIds(
  requested: ReadonlyArray<{ id?: string | null }>,
): Set<string> {
  return new Set(
    requested
      .map((media) => media.id)
      .filter((id): id is string => typeof id === "string" && id.length > 0),
  );
}

/** Mídias gravadas que a requisição não lista mais: saem da página. */
export function findRemovedMedia(
  existing: readonly MediaItemEntity[],
  requested: ReadonlyArray<{ id?: string | null }>,
): MediaItemEntity[] {
  const keep = requestedMediaIds(requested);
  return existing.filter((media) => media.id && !keep.has(media.id));
}

export function localFileUrls(items: readonly MediaItemEntity[]): string[] {
  return items
    .filter((item) => item.isLocalFile && item.url)
    .map((item) => item.url);
}

export function errorReason(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
