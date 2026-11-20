import { Injectable } from "@nestjs/common";

import { CONTENT_PUBLICATION_FULL_PACKAGE_LABEL } from "../constants/content-publication.constants";
import type {
  PublicationDocumentFile,
  PublicationPackageSnapshot,
} from "../content-publication.types";
import {
  StudioExportFormat,
  StudioExportService,
  type StudioExportFile,
} from "../export/studio-export.service";
import { describeTrackAges } from "../utils/content-publication.util";

const FORMAT_LABELS: Readonly<Record<StudioExportFormat, string>> = {
  [StudioExportFormat.DOCX]: "DOCX",
  [StudioExportFormat.PDF]: "PDF",
};

const FORMATS: readonly StudioExportFormat[] = [
  StudioExportFormat.PDF,
  StudioExportFormat.DOCX,
];

/**
 * Renders the documents of the page from the CURRENT saved versions, which are the approved ones: approval is of the
 * current version and any later save moves the stage out of APPROVED (so the package leaves READY_FOR_PUBLICATION).
 * One PDF + one DOCX per track, plus the complete material when there is more than one track.
 */
@Injectable()
export class BuildPublicationDocumentsService {
  constructor(private readonly exports: StudioExportService) {}

  async execute(
    snapshot: PublicationPackageSnapshot,
  ): Promise<PublicationDocumentFile[]> {
    const documents: PublicationDocumentFile[] = [];
    for (const track of snapshot.tracks) {
      for (const format of FORMATS) {
        const file = await this.exports.exportTrack(
          snapshot.packageId,
          track.audience,
          format,
        );
        documents.push(
          this.toDocument(
            file,
            `${track.audienceName} (${FORMAT_LABELS[format]})`,
            `${track.audienceName} · ${describeTrackAges(track)}`,
          ),
        );
      }
    }
    if (snapshot.tracks.length > 1) {
      for (const format of FORMATS) {
        const file = await this.exports.exportPackage(
          snapshot.packageId,
          format,
        );
        documents.push(
          this.toDocument(
            file,
            `${CONTENT_PUBLICATION_FULL_PACKAGE_LABEL} (${FORMAT_LABELS[format]})`,
            snapshot.biblicalReferences,
          ),
        );
      }
    }
    return documents;
  }

  private toDocument(
    file: StudioExportFile,
    title: string,
    description: string,
  ): PublicationDocumentFile {
    return {
      title,
      description,
      fileName: file.fileName,
      contentType: file.contentType,
      buffer: file.buffer,
    };
  }
}
