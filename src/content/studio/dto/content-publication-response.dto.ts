import type { ContentPublicationEntity } from "../entities/content-publication.entity";
import type { ContentAudience } from "../enums/content-audience.enum";
import { ContentPublicationStatus } from "../enums/content-publication-status.enum";
import { ContentPublicationTargetType } from "../enums/content-publication-target-type.enum";
import { CONTENT_PUBLICATION_ERROR_MESSAGES } from "../constants/content-publication.constants";
import type { ContentPublicationErrorCode } from "../enums/content-publication-error-code.enum";

export class ContentPublicationResponseDto {
  id: string;
  packageId: string;
  status: ContentPublicationStatus;
  targetType: ContentPublicationTargetType;
  visitMaterialPageId: string | null;
  /** Categorias que esta publicação levou à página (`null` = publicação antiga, que levava o pacote inteiro). */
  audiences: ContentAudience[] | null;
  /** Public route path of the page (without leading slash handling: use as stored). */
  visitMaterialPagePath: string | null;
  publishedAt: Date | null;
  errorCode: string | null;
  errorMessage: string | null;
  createdAt: Date;

  static fromEntity(
    entity: ContentPublicationEntity,
    pagePath: string | null = null,
  ): ContentPublicationResponseDto {
    const code = entity.errorCode as ContentPublicationErrorCode | null;
    return {
      id: entity.id,
      packageId: entity.packageId,
      status: entity.status,
      targetType: entity.targetType,
      visitMaterialPageId: entity.visitMaterialPageId,
      audiences: entity.audiences ?? null,
      visitMaterialPagePath: pagePath,
      publishedAt: entity.publishedAt,
      errorCode: entity.errorCode,
      errorMessage:
        code && CONTENT_PUBLICATION_ERROR_MESSAGES[code]
          ? CONTENT_PUBLICATION_ERROR_MESSAGES[code]
          : null,
      createdAt: entity.createdAt,
    };
  }
}
