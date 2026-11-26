import { Injectable } from "@nestjs/common";

import { CreateVisitMaterialsPageDto } from "src/content/page/visit-material-page/dto/create-visit-material-page.dto";
import { VisitMaterialSectionInputDto } from "src/content/page/visit-material-page/dto/visit-material-section.dto";
import { VisitMaterialCategory } from "src/content/page/visit-material-page/enums/visit-material-category.enum";
import { TestamentType } from "src/content/page/visit-material-page/enums/testament-type.enum";
import { AppendVisitMaterialSectionsDto } from "src/content/page/visit-material-page/dto/append-visit-material-sections.dto";
import { AppendVisitMaterialSectionsService } from "src/content/page/visit-material-page/services/append-visit-material-sections.service";
import { CreateVisitMaterialPageService } from "src/content/page/visit-material-page/services/create-visit-material-page.service";
import { MediaItemDto } from "src/shared/dto/media-item-dto";
import {
  MediaType,
  UploadType,
} from "src/shared/media/media-item/media-item.entity";

import { ContentAudience } from "../enums/content-audience.enum";
import type {
  PublicationDocumentFile,
  PublicationPackageSnapshot,
  PublishedPageRef,
} from "../content-publication.types";
import {
  documentFieldKey,
  toSyntheticMulterFile,
} from "../utils/content-publication.util";

const CATEGORY_OF_AUDIENCE: Readonly<
  Record<ContentAudience, VisitMaterialCategory>
> = {
  [ContentAudience.BABY]: VisitMaterialCategory.BABY,
  [ContentAudience.CHILD]: VisitMaterialCategory.CHILD,
  [ContentAudience.TEEN]: VisitMaterialCategory.TEEN,
  [ContentAudience.ADULT]: VisitMaterialCategory.ADULT,
};

const audienceNameOf = (
  snapshot: PublicationPackageSnapshot,
  audience: ContentAudience,
): string | undefined =>
  snapshot.tracks.find((track) => track.audience === audience)?.audienceName;

/** Creates the visit-material page for a package through the page module's service. */
@Injectable()
export class CreatePublicationPageService {
  constructor(
    private readonly createPage: CreateVisitMaterialPageService,
    private readonly appendSections: AppendVisitMaterialSectionsService,
  ) {}

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
    if (snapshot.coverImageUrl) dto.coverImageUrl = snapshot.coverImageUrl;
    dto.testament = testament;
    dto.documents = [];
    dto.sections = [];
    const files: Record<string, Express.Multer.File> = {};
    this.fillMedia(dto, snapshot, documents, files);

    const page = await this.createPage.execute(dto, files);
    return {
      id: page.id,
      path: page.route?.path ?? null,
      categories: (page.sections ?? []).map((section) => section.category),
    };
  }

  /**
   * Publicação incremental: acrescenta à página que já existe as seções das categorias recém-aprovadas (e o material
   * completo, quando todas as categorias passam a estar na página). Não toca nas seções já publicadas.
   */
  async append(
    pageId: string,
    snapshot: PublicationPackageSnapshot,
    documents: readonly PublicationDocumentFile[],
  ): Promise<PublishedPageRef> {
    const dto = new AppendVisitMaterialSectionsDto();
    dto.documents = [];
    dto.sections = [];
    const files: Record<string, Express.Multer.File> = {};
    this.fillMedia(dto, snapshot, documents, files);
    const page = await this.appendSections.execute(pageId, dto, files);
    return {
      id: page.id,
      path: page.route?.path ?? null,
      categories: (page.sections ?? []).map((section) => section.category),
    };
  }

  /** Põe cada documento na seção da sua categoria (ou em "Geral", o material completo) e registra o arquivo. */
  private fillMedia(
    dto: CreateVisitMaterialsPageDto | AppendVisitMaterialSectionsDto,
    snapshot: PublicationPackageSnapshot,
    documents: readonly PublicationDocumentFile[],
    files: Record<string, Express.Multer.File>,
  ): void {
    documents.forEach((document, index) => {
      const fieldKey = documentFieldKey(index);
      const media: MediaItemDto = {
        title: document.title,
        description: document.description,
        uploadType: UploadType.UPLOAD,
        mediaType: MediaType.DOCUMENT,
        isLocalFile: true,
        fieldKey,
        originalName: document.fileName,
        size: document.buffer.length,
      };
      // Documento de uma faixa vai para a seção da categoria; o material completo fica em "Geral".
      if (document.audience) {
        const category = CATEGORY_OF_AUDIENCE[document.audience];
        let section = dto.sections?.find((item) => item.category === category);
        if (!section) {
          section = new VisitMaterialSectionInputDto();
          section.category = category;
          section.title = audienceNameOf(snapshot, document.audience);
          section.documents = [];
          dto.sections?.push(section);
        }
        section.documents?.push(media);
      } else {
        dto.documents?.push(media);
      }
      files[fieldKey] = toSyntheticMulterFile(fieldKey, document);
    });
  }
}
