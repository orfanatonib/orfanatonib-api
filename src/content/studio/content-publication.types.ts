import type { ContentAudience } from "./enums/content-audience.enum";
import type { ContentPublicationEntity } from "./entities/content-publication.entity";

/** Track facts needed to build the documents of the published page. */
export interface PublicationTrackSnapshot {
  readonly audience: ContentAudience;
  readonly audienceName: string;
  readonly minimumAge: number;
  readonly maximumAge: number | null;
}

/** What the publication needs from the package, read under lock (no entity leaks out of the repository). */
export interface PublicationPackageSnapshot {
  readonly packageId: string;
  readonly theme: string;
  readonly biblicalReferences: string;
  readonly canonicalObjective: string;
  readonly tracks: readonly PublicationTrackSnapshot[];
}

export interface BegunPublication {
  readonly publication: ContentPublicationEntity;
  readonly snapshot: PublicationPackageSnapshot;
}

/** Rendered document ready to be sent as a synthetic multipart file. */
export interface PublicationDocumentFile {
  readonly title: string;
  readonly description: string;
  readonly fileName: string;
  readonly contentType: string;
  readonly buffer: Buffer;
}

/** Location of the published page, resolved through the visit-material service. */
export interface PublishedPageRef {
  readonly id: string;
  readonly path: string | null;
}
