import { ContentGenerationJobStatus } from "./enums/content-generation-job-status.enum";
import { ContentPackageStatus } from "./enums/content-package-status.enum";
import { ContentStageType } from "./enums/content-stage-type.enum";
import { AiGenerationCapability } from "./ai/enums/ai-generation-capability.enum";
import { ContentAudience } from "./enums/content-audience.enum";
import { ContentReviewDecisionType } from "./enums/content-review-decision-type.enum";
import { ContentPackageEntity } from "./entities/content-package.entity";

export interface ContentAudienceDefinition {
  readonly audience: ContentAudience;
  readonly name: string;
  readonly minimumAge: number;
  readonly maximumAge: number | null;
  readonly stages: readonly ContentStageDefinition[];
}

export interface ContentStageDefinition {
  readonly type: ContentStageType;
  readonly name: string;
  readonly position: number;
  readonly required: boolean;
  readonly dependencies: readonly ContentStageType[];
}

export interface ContentStudioCapabilities {
  readonly generation: boolean;
  readonly review: boolean;
  readonly publication: boolean;
  readonly providerAdministration: boolean;
}

export interface CreateContentPackageGraphInput {
  readonly theme: string;
  readonly biblicalReferences: string;
  readonly canonicalObjective: string;
  readonly canonicalNotes: string | null;
  readonly templateCatalogVersion: string;
  readonly createdById: string;
  readonly audiences: readonly ContentAudienceDefinition[];
}

export interface QueryContentPackagesInput {
  readonly page?: number;
  readonly limit?: number;
  readonly search?: string;
  readonly status?: ContentPackageStatus;
  readonly reviewQueue?: boolean;
  readonly audience?: ContentAudience;
  readonly startDate?: string;
  readonly endDate?: string;
}

export interface RequestContentStageGenerationInput {
  readonly packageId: string;
  readonly stageId: string;
  readonly capability: AiGenerationCapability;
  readonly idempotencyKey: string;
  readonly requestedById: string;
  readonly revisionInstructions?: string | null;
}

export interface SaveContentStageVersionInput {
  readonly packageId: string;
  readonly stageId: string;
  readonly structuredContent: Record<string, unknown>;
  /** Documento rico editado à mão (ou `null`). */
  readonly contentDocument?: Record<string, unknown> | null;
  readonly contentChecksum: string;
  readonly templateVersion: string;
  readonly generationSnapshot: Record<string, unknown> | null;
  readonly createdById: string;
  /** Job de geração que está concluindo: vira SUCCEEDED na mesma transação (não é cancelado). */
  readonly completedJobId?: string;
}

export interface StartedGenerationJob {
  readonly jobId: string;
  readonly packageId: string;
  readonly stageId: string;
  readonly stageType: string;
  readonly theme: string;
  readonly capability: AiGenerationCapability;
  readonly requestedById: string;
  readonly attempts: number;
}

export interface FailGenerationJobInput {
  readonly jobId: string;
  readonly retry: boolean;
  readonly availableAt?: Date;
  readonly errorCode: string;
  readonly errorMessage: string;
}

export interface CompleteContentStageProductionInput {
  readonly packageId: string;
  readonly stageId: string;
}

export interface RequestContentStageChangesInput {
  readonly packageId: string;
  readonly stageId: string;
  readonly message: string;
  readonly blockKey: string | null;
  readonly authorId: string;
  readonly versionId: string;
  readonly lockVersion: number;
  readonly contentChecksum: string;
}

export interface ApproveContentStageInput {
  readonly packageId: string;
  readonly stageId: string;
  readonly versionId: string;
  readonly lockVersion: number;
  readonly contentChecksum: string;
  readonly reviewerId: string;
}

export const ACTIVE_CONTENT_GENERATION_JOB_STATUSES: readonly ContentGenerationJobStatus[] =
  [
    ContentGenerationJobStatus.PENDING,
    ContentGenerationJobStatus.RUNNING,
    ContentGenerationJobStatus.RETRY_SCHEDULED,
  ] as const;

export interface DashboardPackageStats {
  readonly total: number;
  readonly byStatus: Record<ContentPackageStatus, number>;
  readonly inProduction: number;
  readonly awaitingReview: number;
  readonly readyForPublication: number;
  readonly publishedTotal: number;
}

export interface DashboardStageStats {
  readonly total: number;
  readonly approved: number;
  readonly pendingReview: number;
  readonly changesRequested: number;
  readonly failed: number;
}

export interface DashboardJobStats {
  readonly pending: number;
  readonly running: number;
  readonly failed: number;
}

export interface DashboardData {
  readonly packages: DashboardPackageStats;
  readonly stages: DashboardStageStats;
  readonly jobs: DashboardJobStats;
  readonly recent: ContentPackageEntity[];
}

export interface ContentStudioDashboardQuery {
  readonly startDate?: string;
  readonly endDate?: string;
  readonly audience?: ContentAudience;
}

export interface ContentReviewDecisionView {
  readonly id: string;
  readonly versionId: string;
  readonly contentChecksum: string;
  readonly decision: ContentReviewDecisionType;
  readonly reviewerId: string;
  readonly relatedCommentId: string | null;
  readonly decidedAt: Date;
}
