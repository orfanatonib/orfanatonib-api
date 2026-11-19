import { Injectable } from "@nestjs/common";

import { CreateVisitMaterialsPageDto } from "src/content/page/visit-material-page/dto/create-visit-material-page.dto";
import { TestamentType } from "src/content/page/visit-material-page/enums/testament-type.enum";
import { CreateVisitMaterialPageService } from "src/content/page/visit-material-page/services/create-visit-material-page.service";
import {
  MediaType,
  UploadType,
} from "src/shared/media/media-item/media-item.entity";

import type {
  PublicationDocumentFile,
  PublicationPackageSnapshot,
  PublishedPageRef,
} from "../content-publication.types";
import {
  documentFieldKey,
  toSyntheticMulterFile,
} from "../utils/content-publication.util";

/** Creates the visit-material page for a package through the page module's service. */
@Injectable()
export class CreatePublicationPageService {
  constructor(private readonly createPage: CreateVisitMaterialPageService) {}

  async execute(
    snapshot: PublicationPackageSnapshot,
    testament: TestamentType,
    documents: readonly PublicationDocumentFile[],
  ): Promise<PublishedPageRef> {
    const dto = new CreateVisitMaterialsPageDto();
    // `sourceLessonId` has a unique index: the same package can never produce two pages.
    dto.sourceLessonId = snapshot.packageId;
    dto.pageTitle = snapshot.theme;
    dto.pageSubtitle = snapshot.biblicalReferences;
    dto.pageDescription = snapshot.canonicalObjective;
    dto.testament = testament;
    dto.documents = [];
    const files: Record<string, Express.Multer.File> = {};
    documents.forEach((document, index) => {
      const fieldKey = documentFieldKey(index);
      dto.documents?.push({
        title: document.title,
        description: document.description,
        uploadType: UploadType.UPLOAD,
        mediaType: MediaType.DOCUMENT,
        isLocalFile: true,
        fieldKey,
        originalName: document.fileName,
        size: document.buffer.length,
      });
      files[fieldKey] = toSyntheticMulterFile(fieldKey, document);
    });

    const page = await this.createPage.execute(dto, files);
    return { id: page.id, path: page.route?.path ?? null };
  }
}
