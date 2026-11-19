import { ContentPackageEntity } from "../entities/content-package.entity";
import { ContentStageEntity } from "../entities/content-stage.entity";
import { ContentTrackEntity } from "../entities/content-track.entity";
import { ContentVersionEntity } from "../entities/content-version.entity";
import { ContentAudience } from "../enums/content-audience.enum";
import { ContentPackageStatus } from "../enums/content-package-status.enum";
import { ContentStageStatus } from "../enums/content-stage-status.enum";
import { ContentStageType } from "../enums/content-stage-type.enum";
import { ContentReviewCommentEntity } from "../entities/content-review-comment.entity";
import { ContentReviewCommentStatus } from "../enums/content-review-comment-status.enum";
import { ContentReviewDecisionType } from "../enums/content-review-decision-type.enum";
import { ContentReviewDecisionEntity } from "../entities/content-review-decision.entity";

export class ContentReviewDecisionResponseDto {
  id: string;
  versionId: string;
  versionNumber: number | null;
  contentChecksum: string;
  decision: ContentReviewDecisionType;
  reviewerId: string;
  relatedCommentId: string | null;
  decidedAt: Date;

  static fromEntity(
    entity: ContentReviewDecisionEntity,
  ): ContentReviewDecisionResponseDto {
    return {
      id: entity.id,
      versionId: entity.versionId,
      versionNumber: entity.version?.versionNumber ?? null,
      contentChecksum: entity.contentChecksum,
      decision: entity.decision,
      reviewerId: entity.reviewerId,
      relatedCommentId: entity.relatedCommentId,
      decidedAt: entity.decidedAt,
    };
  }
}

export class ContentReviewCommentResponseDto {
  id: string;
  versionId: string;
  blockKey: string | null;
  message: string;
  status: ContentReviewCommentStatus;
  authorId: string;
  createdAt: Date;

  static fromEntity(
    entity: ContentReviewCommentEntity,
  ): ContentReviewCommentResponseDto {
    return {
      id: entity.id,
      versionId: entity.versionId,
      blockKey: entity.blockKey,
      message: entity.message,
      status: entity.status,
      authorId: entity.authorId,
      createdAt: entity.createdAt,
    };
  }
}

export class ContentStageResponseDto {
  id: string;
  stageType: ContentStageType;
  position: number;
  required: boolean;
  dependencies: ContentStageType[];
  status: ContentStageStatus;
  currentVersionId: string | null;
  lockVersion: number;
  currentVersion: ContentVersionResponseDto | null;
  reviewComments: ContentReviewCommentResponseDto[];
  reviewDecisions: ContentReviewDecisionResponseDto[];
  createdAt: Date;
  updatedAt: Date;

  static fromEntity(entity: ContentStageEntity): ContentStageResponseDto {
    return {
      id: entity.id,
      stageType: entity.stageType,
      position: entity.position,
      required: entity.required,
      dependencies: [...entity.dependencies],
      status: entity.status,
      currentVersionId: entity.currentVersionId,
      lockVersion: entity.lockVersion,
      currentVersion: entity.currentVersion
        ? ContentVersionResponseDto.fromEntity(entity.currentVersion)
        : null,
      reviewComments: [...(entity.reviewComments ?? [])]
        .sort(
          (left, right) => left.createdAt.getTime() - right.createdAt.getTime(),
        )
        .map(ContentReviewCommentResponseDto.fromEntity),
      reviewDecisions: [...(entity.reviewDecisions ?? [])]
        .sort(
          (left, right) => left.decidedAt.getTime() - right.decidedAt.getTime(),
        )
        .map(ContentReviewDecisionResponseDto.fromEntity),
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }
}

export class ContentVersionResponseDto {
  id: string;
  stageId: string;
  versionNumber: number;
  structuredContent: Record<string, unknown>;
  /** Documento rico editado à mão; `null` quando a prévia/exportação são montadas dos campos. */
  contentDocument: Record<string, unknown> | null;
  contentChecksum: string;
  templateVersion: string;
  generationSnapshot: Record<string, unknown> | null;
  createdById: string;
  createdAt: Date;
  updatedAt: Date;

  static fromEntity(entity: ContentVersionEntity): ContentVersionResponseDto {
    return {
      id: entity.id,
      stageId: entity.stageId,
      versionNumber: entity.versionNumber,
      structuredContent: entity.structuredContent,
      contentDocument: entity.contentDocument ?? null,
      contentChecksum: entity.contentChecksum,
      templateVersion: entity.templateVersion,
      generationSnapshot: entity.generationSnapshot,
      createdById: entity.createdById,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }
}

export class ContentTrackResponseDto {
  id: string;
  audience: ContentAudience;
  audienceName: string;
  minimumAge: number;
  maximumAge: number | null;
  stages: ContentStageResponseDto[];
  createdAt: Date;
  updatedAt: Date;

  static fromEntity(entity: ContentTrackEntity): ContentTrackResponseDto {
    const stages = [...(entity.stages ?? [])].sort(
      (left, right) => left.position - right.position,
    );

    return {
      id: entity.id,
      audience: entity.audience,
      audienceName: entity.audienceName,
      minimumAge: entity.minimumAge,
      maximumAge: entity.maximumAge,
      stages: stages.map(ContentStageResponseDto.fromEntity),
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }
}

export class ContentPackageResponseDto {
  id: string;
  theme: string;
  biblicalReferences: string;
  canonicalObjective: string;
  canonicalNotes: string | null;
  templateCatalogVersion: string;
  status: ContentPackageStatus;
  createdById: string;
  archivedAt: Date | null;
  lockVersion: number;
  tracks: ContentTrackResponseDto[];
  createdAt: Date;
  updatedAt: Date;

  static fromEntity(entity: ContentPackageEntity): ContentPackageResponseDto {
    const tracks = [...(entity.tracks ?? [])].sort(
      (left, right) => left.minimumAge - right.minimumAge,
    );

    return {
      id: entity.id,
      theme: entity.theme,
      biblicalReferences: entity.biblicalReferences,
      canonicalObjective: entity.canonicalObjective,
      canonicalNotes: entity.canonicalNotes,
      templateCatalogVersion: entity.templateCatalogVersion,
      status: entity.status,
      createdById: entity.createdById,
      archivedAt: entity.archivedAt,
      lockVersion: entity.lockVersion,
      tracks: tracks.map(ContentTrackResponseDto.fromEntity),
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }
}

export class ContentStageSegmentDto {
  audience: ContentAudience;
  stageType: ContentStageType;
  status: ContentStageStatus;
}

export class ContentPackageListItemResponseDto {
  id: string;
  theme: string;
  biblicalReferences: string;
  status: ContentPackageStatus;
  templateCatalogVersion: string;
  createdById: string;
  tracksCount: number;
  /** Faixas etárias do material, da mais nova para a mais velha (para o cartão da listagem). */
  audiences: ContentAudience[];
  stagesCount: number;
  requiredStagesCount: number;
  approvedStagesCount: number;
  /** Etapas com alguma versão salva (o PDF do material só existe a partir de uma). */
  stagesWithContentCount: number;
  generatingStagesCount: number;
  failedStagesCount: number;
  /** Uma etapa por segmento (faixa da mais nova à mais velha, etapas na ordem de produção). */
  stageSegments: ContentStageSegmentDto[];
  createdAt: Date;
  updatedAt: Date;

  static fromEntity(
    entity: ContentPackageEntity,
  ): ContentPackageListItemResponseDto {
    const tracks = entity.tracks ?? [];
    const stages = tracks.flatMap((track) => track.stages ?? []);

    return {
      id: entity.id,
      theme: entity.theme,
      biblicalReferences: entity.biblicalReferences,
      status: entity.status,
      templateCatalogVersion: entity.templateCatalogVersion,
      createdById: entity.createdById,
      tracksCount: tracks.length,
      audiences: [...tracks]
        .sort((a, b) => a.minimumAge - b.minimumAge)
        .map((track) => track.audience),
      stagesCount: stages.length,
      requiredStagesCount: stages.filter((stage) => stage.required).length,
      approvedStagesCount: stages.filter(
        (stage) =>
          stage.required && stage.status === ContentStageStatus.APPROVED,
      ).length,
      stagesWithContentCount: stages.filter(
        (stage) => stage.currentVersionId !== null,
      ).length,
      generatingStagesCount: stages.filter(
        (stage) => stage.status === ContentStageStatus.GENERATING,
      ).length,
      failedStagesCount: stages.filter(
        (stage) => stage.status === ContentStageStatus.FAILED,
      ).length,
      stageSegments: [...tracks]
        .sort((a, b) => a.minimumAge - b.minimumAge)
        .flatMap((track) =>
          [...(track.stages ?? [])]
            .sort((a, b) => a.position - b.position)
            .map((stage) => ({
              audience: track.audience,
              stageType: stage.stageType,
              status: stage.status,
            })),
        ),
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }
}

export class PaginatedContentPackagesResponseDto {
  data: ContentPackageListItemResponseDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;

  constructor(
    data: ContentPackageListItemResponseDto[],
    total: number,
    page: number,
    limit: number,
  ) {
    this.data = data;
    this.total = total;
    this.page = page;
    this.limit = limit;
    this.totalPages = Math.ceil(total / limit);
  }
}
