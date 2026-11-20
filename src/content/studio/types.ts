import type { VisualConfig } from "./dto/visual-config.dto";
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

/** Campos de ordenação da listagem de materiais. */
export type ContentPackageSort = "updatedAt" | "createdAt" | "theme";
export const CONTENT_PACKAGE_SORTS: readonly ContentPackageSort[] = [
  "updatedAt",
  "createdAt",
  "theme",
];

export interface QueryContentPackagesInput {
  readonly page?: number;
  readonly limit?: number;
  readonly search?: string;
  readonly status?: ContentPackageStatus;
  readonly statuses?: readonly ContentPackageStatus[];
  readonly reviewQueue?: boolean;
  readonly audience?: ContentAudience;
  readonly startDate?: string;
  readonly endDate?: string;
  readonly sort?: ContentPackageSort;
  readonly order?: "ASC" | "DESC";
}

export interface RequestContentStageGenerationInput {
  readonly packageId: string;
  readonly stageId: string;
  readonly capability: AiGenerationCapability;
  readonly idempotencyKey: string;
  readonly requestedById: string;
  readonly revisionInstructions?: string | null;
  /** Escolhas dos visuais (só na etapa "Visuais da lição"). */
  readonly visualConfig?: VisualConfig | null;
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
  /** Pedido gravado no job (as chaves variam por capacidade: texto ou imagens). */
  readonly request?: Record<string, unknown>;
  /** Motivo da tentativa anterior (só quando for uma nova tentativa): vira aviso ao modelo. */
  readonly previousError?: string | null;
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
  /** Job de imagens: o texto já existe e está aprovado; a falha não derruba a etapa. */
  readonly keepStage?: boolean;
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

/** Pedido de imagens de uma versão (as do texto gerado, ou só algumas para regenerar). */
export interface RequestContentStageImagesInput {
  readonly packageId: string;
  readonly stageId: string;
  readonly versionId: string;
  readonly slots?: readonly string[] | null;
  readonly instructions?: string | null;
  readonly idempotencyKey: string;
  readonly requestedById: string;
  /** Só o encadeamento automático texto → imagens: a geração de texto já ocupa a vaga da categoria. */
  readonly skipCapacityCheck?: boolean;
}

/** O que o worker de imagens precisa da versão atual da etapa. */
export interface StageImageContext {
  readonly packageId: string;
  readonly stageId: string;
  readonly stageType: string;
  readonly audience: string;
  readonly versionId: string;
  readonly content: Record<string, unknown>;
}

/** Fases de um job de TEXTO, na ordem em que acontecem (a tela desenha a linha do tempo com elas). */
export type TextJobStep = "PREPARING" | "WRITING" | "VALIDATING" | "SAVING";

/** Andamento de um job de texto: a fase atual e quando a execução começou (a tela estima o progresso com isso). */
export interface TextJobProgress {
  readonly phase: "TEXT";
  readonly step: TextJobStep;
  readonly startedAt: string;
}

export interface ImageJobProgress {
  readonly phase: "IMAGES";
  readonly done: number;
  readonly total: number;
  readonly failed: readonly string[];
}
