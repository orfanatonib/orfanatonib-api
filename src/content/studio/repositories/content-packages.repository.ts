import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import {
  DataSource,
  EntityManager,
  In,
  Repository,
  SelectQueryBuilder,
} from "typeorm";

import {
  ResourceConflictException,
  ResourceNotFoundException,
  RuleException,
} from "src/common/exceptions";

import { CONTENT_STUDIO_CATALOG_VERSION } from "../constants";
import type { StageGenerationContext } from "../ai/generation/stage-prompt.builder";
import { ContentGenerationJobEntity } from "../entities/content-generation-job.entity";
import { ContentPackageEntity } from "../entities/content-package.entity";
import { ContentReviewCommentEntity } from "../entities/content-review-comment.entity";
import { ContentReviewDecisionEntity } from "../entities/content-review-decision.entity";
import { ContentStageEntity } from "../entities/content-stage.entity";
import { ContentTrackEntity } from "../entities/content-track.entity";
import { ContentVersionEntity } from "../entities/content-version.entity";
import { ContentGenerationJobStatus } from "../enums/content-generation-job-status.enum";
import { ContentPackageStatus } from "../enums/content-package-status.enum";
import { ContentReviewCommentStatus } from "../enums/content-review-comment-status.enum";
import { ContentReviewDecisionType } from "../enums/content-review-decision-type.enum";
import { ContentStageStatus } from "../enums/content-stage-status.enum";
import { ContentStageType } from "../enums/content-stage-type.enum";
import {
  ACTIVE_CONTENT_GENERATION_JOB_STATUSES,
  ApproveContentStageInput,
  CompleteContentStageProductionInput,
  CreateContentPackageGraphInput,
  QueryContentPackagesInput,
  RequestContentStageGenerationInput,
  RequestContentStageChangesInput,
  FailGenerationJobInput,
  SaveContentStageVersionInput,
  StartedGenerationJob,
} from "../types";
import {
  canTransitionContentPackage,
  canTransitionContentStage,
} from "../utils/content-state-transition.util";

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;
const DEPENDENCY_READY_STATUSES: readonly ContentStageStatus[] = [
  ContentStageStatus.DRAFT,
  ContentStageStatus.PRODUCER_APPROVED,
  ContentStageStatus.APPROVED,
] as const;
const MANUAL_CONTENT_ALLOWED_STATUSES: readonly ContentStageStatus[] = [
  ContentStageStatus.NOT_STARTED,
  ContentStageStatus.GENERATING,
  ContentStageStatus.DRAFT,
  ContentStageStatus.FAILED,
  ContentStageStatus.STALE,
  ContentStageStatus.CHANGES_REQUESTED,
  ContentStageStatus.PRODUCER_APPROVED,
  ContentStageStatus.APPROVED,
] as const;
const COMPLETED_STAGE_STATUSES: readonly ContentStageStatus[] = [
  ContentStageStatus.PRODUCER_APPROVED,
  ContentStageStatus.APPROVED,
] as const;

type StageContext = {
  readonly contentPackage: ContentPackageEntity;
  readonly stage: ContentStageEntity;
  readonly trackStages: ContentStageEntity[];
};

@Injectable()
export class ContentPackagesRepository {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(ContentPackageEntity)
    private readonly packageRepo: Repository<ContentPackageEntity>,
    @InjectRepository(ContentTrackEntity)
    private readonly trackRepo: Repository<ContentTrackEntity>,
    @InjectRepository(ContentStageEntity)
    private readonly stageRepo: Repository<ContentStageEntity>,
  ) {}

  async createWithCatalog(
    input: CreateContentPackageGraphInput,
  ): Promise<ContentPackageEntity> {
    return this.dataSource.transaction(async (manager) => {
      const packageRepo = manager.getRepository(ContentPackageEntity);
      const trackRepo = manager.getRepository(ContentTrackEntity);
      const stageRepo = manager.getRepository(ContentStageEntity);

      const contentPackage = await packageRepo.save(
        packageRepo.create({
          theme: input.theme,
          biblicalReferences: input.biblicalReferences,
          canonicalObjective: input.canonicalObjective,
          canonicalNotes: input.canonicalNotes,
          templateCatalogVersion: input.templateCatalogVersion,
          status: ContentPackageStatus.DRAFT,
          createdById: input.createdById,
        }),
      );

      const tracks = await trackRepo.save(
        input.audiences.map((definition) =>
          trackRepo.create({
            packageId: contentPackage.id,
            audience: definition.audience,
            audienceName: definition.name,
            minimumAge: definition.minimumAge,
            maximumAge: definition.maximumAge,
          }),
        ),
      );

      const trackByAudience = new Map(
        tracks.map((track) => [track.audience, track.id]),
      );

      await stageRepo.save(
        input.audiences.flatMap((definition) => {
          const trackId = trackByAudience.get(definition.audience);
          if (!trackId) return [];

          return definition.stages.map((stage) =>
            stageRepo.create({
              trackId,
              stageType: stage.type,
              position: stage.position,
              required: stage.required,
              dependencies: [...stage.dependencies],
            }),
          );
        }),
      );

      const saved = await packageRepo.findOne({
        where: { id: contentPackage.id },
        relations: { tracks: { stages: { currentVersion: true } } },
      });

      return saved ?? contentPackage;
    });
  }

  async findAllPaginated(query: QueryContentPackagesInput): Promise<{
    data: ContentPackageEntity[];
    total: number;
    page: number;
    limit: number;
  }> {
    const page = Math.max(DEFAULT_PAGE, Number(query.page) || DEFAULT_PAGE);
    const limit = Math.min(
      MAX_LIMIT,
      Math.max(1, Number(query.limit) || DEFAULT_LIMIT),
    );
    const skip = (page - 1) * limit;

    const countQb = this.packageRepo.createQueryBuilder("contentPackage");
    this.applyFilters(countQb, query);
    const total = await countQb.getCount();

    const dataQb = this.packageRepo
      .createQueryBuilder("contentPackage")
      .leftJoinAndSelect("contentPackage.tracks", "track")
      .leftJoinAndSelect("track.stages", "stage");

    this.applyFilters(dataQb, query);

    const data = await dataQb
      .orderBy("contentPackage.createdAt", "DESC")
      .addOrderBy("track.minimumAge", "ASC")
      .addOrderBy("stage.position", "ASC")
      .skip(skip)
      .take(limit)
      .getMany();

    return { data, total, page, limit };
  }

  async findByIdWithGraph(id: string): Promise<ContentPackageEntity | null> {
    return this.packageRepo.findOne({
      where: { id },
      relations: {
        tracks: {
          stages: {
            currentVersion: true,
            reviewComments: true,
            reviewDecisions: { version: true },
          },
        },
      },
    });
  }

  async requestStageGeneration(
    input: RequestContentStageGenerationInput,
  ): Promise<ContentGenerationJobEntity> {
    return this.dataSource.transaction(async (manager) => {
      const jobRepo = manager.getRepository(ContentGenerationJobEntity);
      const stageRepo = manager.getRepository(ContentStageEntity);
      const packageRepo = manager.getRepository(ContentPackageEntity);
      const { contentPackage, stage, trackStages } =
        await this.findStageContextOrFail(
          manager,
          input.packageId,
          input.stageId,
        );
      this.assertPackageCanProduce(contentPackage);

      const existingIdempotentJob = await jobRepo.findOne({
        where: { idempotencyKey: input.idempotencyKey },
      });

      if (existingIdempotentJob) {
        if (existingIdempotentJob.stageId !== input.stageId) {
          throw new ResourceConflictException(
            "Chave de idempotência já usada em outra etapa",
          );
        }

        if (existingIdempotentJob.capability !== input.capability) {
          throw new ResourceConflictException(
            "Chave de idempotência reutilizada com uma capacidade diferente",
          );
        }

        return existingIdempotentJob;
      }

      const activeJob = await jobRepo.findOne({
        where: {
          stageId: input.stageId,
          status: In([...ACTIVE_CONTENT_GENERATION_JOB_STATUSES]),
        },
      });

      if (activeJob) {
        throw new ResourceConflictException(
          "Já existe geração ativa para esta etapa",
          {
            jobId: activeJob.id,
            status: activeJob.status,
          },
        );
      }

      this.assertDependenciesReady(stage, trackStages);

      if (
        !canTransitionContentStage(stage.status, ContentStageStatus.GENERATING)
      ) {
        throw new ResourceConflictException(
          `A etapa não pode iniciar geração a partir de ${stage.status}`,
        );
      }

      const job = await jobRepo.save(
        jobRepo.create({
          stageId: stage.id,
          idempotencyKey: input.idempotencyKey,
          capability: input.capability,
          status: ContentGenerationJobStatus.PENDING,
          normalizedRequest: {
            packageId: contentPackage.id,
            stageId: stage.id,
            stageType: stage.stageType,
            capability: input.capability,
            theme: contentPackage.theme,
            revisionInstructions: input.revisionInstructions ?? null,
          },
          configurationSnapshot: {
            catalogVersion: CONTENT_STUDIO_CATALOG_VERSION,
            provider: null,
            model: null,
            policyVersion: CONTENT_STUDIO_CATALOG_VERSION,
          },
          attempts: 0,
          availableAt: new Date(),
          requestedById: input.requestedById,
        }),
      );

      stage.status = ContentStageStatus.GENERATING;
      await stageRepo.save(stage);
      await this.movePackageToInProgress(packageRepo, contentPackage);

      return job;
    });
  }

  /**
   * Tudo de que o gerador precisa para UMA etapa: pacote, público (trilha), conteúdo atual das
   * etapas das quais ela depende e rótulos das versões anteriores (para regeneração).
   */
  async loadStageGenerationContext(
    stageId: string,
    jobId?: string,
  ): Promise<StageGenerationContext | null> {
    const stage = await this.dataSource
      .getRepository(ContentStageEntity)
      .findOne({
        where: { id: stageId },
        relations: { track: { contentPackage: true, stages: true } },
      });
    if (!stage?.track?.contentPackage) return null;

    const versionRepo = this.dataSource.getRepository(ContentVersionEntity);
    const upstream: Partial<Record<ContentStageType, Record<string, unknown>>> =
      {};
    const dependencies = (stage.track.stages ?? [])
      .filter(
        (s) => stage.dependencies.includes(s.stageType) && s.currentVersionId,
      )
      .sort((a, b) => a.position - b.position);
    for (const dependency of dependencies) {
      const version = await versionRepo.findOne({
        where: { id: dependency.currentVersionId ?? "" },
      });
      if (version) upstream[dependency.stageType] = version.structuredContent;
    }

    const previous = await versionRepo.find({
      where: { stageId },
      order: { versionNumber: "DESC" },
      take: 8,
    });
    const previousVariants = previous
      .reverse()
      .map((version) => {
        const content = version.structuredContent;
        const label = content.name ?? content.title;
        return typeof label === "string" ? label : "";
      })
      .filter(Boolean);

    let revisionInstructions: string | null = null;
    if (jobId) {
      const job = await this.dataSource
        .getRepository(ContentGenerationJobEntity)
        .findOne({ where: { id: jobId } });
      const raw = (
        job?.normalizedRequest as { revisionInstructions?: unknown } | undefined
      )?.revisionInstructions;
      revisionInstructions = typeof raw === "string" && raw.trim() ? raw : null;
    }

    const pkg = stage.track.contentPackage;
    return {
      revisionInstructions,
      stageType: stage.stageType,
      audience: stage.track.audience,
      theme: pkg.theme,
      biblicalReferences: pkg.biblicalReferences,
      canonicalObjective: pkg.canonicalObjective,
      canonicalNotes: pkg.canonicalNotes,
      upstream,
      previousVariants,
    };
  }

  /** Jobs que precisam voltar para a fila (boot/reconciliação): pendentes, reagendados e RUNNING com lease vencido. */
  async findRecoverableGenerationJobs(
    now: Date,
    limit = 100,
  ): Promise<ContentGenerationJobEntity[]> {
    const repo = this.dataSource.getRepository(ContentGenerationJobEntity);
    return repo
      .createQueryBuilder("job")
      .where("job.status IN (:...open)", {
        open: [
          ContentGenerationJobStatus.PENDING,
          ContentGenerationJobStatus.RETRY_SCHEDULED,
        ],
      })
      .orWhere("job.status = :running AND job.leaseExpiresAt < :now", {
        running: ContentGenerationJobStatus.RUNNING,
        now,
      })
      .orderBy("job.createdAt", "ASC")
      .take(limit)
      .getMany();
  }

  /** Pega o job para executar (lease). `null` se já concluído/cancelado ou em execução por outro worker. */
  async startGenerationJob(
    jobId: string,
    workerId: string,
    leaseMs: number,
    now: Date = new Date(),
  ): Promise<StartedGenerationJob | null> {
    return this.dataSource.transaction(async (manager) => {
      const jobRepo = manager.getRepository(ContentGenerationJobEntity);
      const job = await jobRepo.findOne({
        where: { id: jobId },
        lock: { mode: "pessimistic_write" },
      });
      if (!job) return null;

      const runnable =
        job.status === ContentGenerationJobStatus.PENDING ||
        job.status === ContentGenerationJobStatus.RETRY_SCHEDULED ||
        (job.status === ContentGenerationJobStatus.RUNNING &&
          !!job.leaseExpiresAt &&
          job.leaseExpiresAt < now);
      if (!runnable) return null;

      job.status = ContentGenerationJobStatus.RUNNING;
      job.attempts += 1;
      job.workerId = workerId;
      job.heartbeatAt = now;
      job.leaseExpiresAt = new Date(now.getTime() + leaseMs);
      await jobRepo.save(job);

      const request = job.normalizedRequest as {
        packageId?: string;
        stageType?: string;
        theme?: string;
      };
      return {
        jobId: job.id,
        packageId: request.packageId ?? "",
        stageId: job.stageId,
        stageType: request.stageType ?? "",
        theme: request.theme ?? "",
        capability: job.capability,
        requestedById: job.requestedById,
        attempts: job.attempts,
      };
    });
  }

  /** Falha transitória (RETRY_SCHEDULED) ou definitiva (FAILED + etapa FAILED). Ignora job já cancelado. */
  async failGenerationJob(input: FailGenerationJobInput): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      const jobRepo = manager.getRepository(ContentGenerationJobEntity);
      const job = await jobRepo.findOne({
        where: { id: input.jobId },
        lock: { mode: "pessimistic_write" },
      });
      if (!job || job.status !== ContentGenerationJobStatus.RUNNING) return;

      job.status = input.retry
        ? ContentGenerationJobStatus.RETRY_SCHEDULED
        : ContentGenerationJobStatus.FAILED;
      job.errorCode = input.errorCode.slice(0, 80);
      job.errorMessage = input.errorMessage.slice(0, 500);
      job.workerId = null;
      job.leaseExpiresAt = null;
      job.heartbeatAt = null;
      if (input.retry && input.availableAt) job.availableAt = input.availableAt;
      await jobRepo.save(job);

      if (!input.retry) {
        const stageRepo = manager.getRepository(ContentStageEntity);
        const stage = await stageRepo.findOne({ where: { id: job.stageId } });
        if (
          stage &&
          canTransitionContentStage(stage.status, ContentStageStatus.FAILED)
        ) {
          stage.status = ContentStageStatus.FAILED;
          await stageRepo.save(stage);
        }
      }
    });
  }

  /** Última geração pedida para a etapa (qualquer estado), para o front acompanhar o andamento. */
  async findLatestGenerationJob(
    packageId: string,
    stageId: string,
  ): Promise<ContentGenerationJobEntity | null> {
    return this.dataSource.transaction(async (manager) => {
      await this.findStageContextOrFail(manager, packageId, stageId);
      return manager.getRepository(ContentGenerationJobEntity).findOne({
        where: { stageId },
        order: { createdAt: "DESC" },
      });
    });
  }

  /** Cancela a geração ativa da etapa (ação do usuário). Devolve o job cancelado ou null. */
  async cancelGenerationJob(
    packageId: string,
    stageId: string,
  ): Promise<ContentGenerationJobEntity | null> {
    return this.dataSource.transaction(async (manager) => {
      const { stage } = await this.findStageContextOrFail(
        manager,
        packageId,
        stageId,
      );
      const jobRepo = manager.getRepository(ContentGenerationJobEntity);
      const job = await jobRepo.findOne({
        where: {
          stageId,
          status: In([...ACTIVE_CONTENT_GENERATION_JOB_STATUSES]),
        },
      });
      if (!job) return null;

      job.status = ContentGenerationJobStatus.CANCELLED;
      job.workerId = null;
      job.leaseExpiresAt = null;
      job.heartbeatAt = null;
      await jobRepo.save(job);

      if (
        stage.status === ContentStageStatus.GENERATING &&
        canTransitionContentStage(stage.status, ContentStageStatus.FAILED)
      ) {
        const stageRepo = manager.getRepository(ContentStageEntity);
        stage.status = ContentStageStatus.FAILED;
        await stageRepo.save(stage);
      }
      return job;
    });
  }

  async saveStageContent(
    input: SaveContentStageVersionInput,
  ): Promise<ContentPackageEntity> {
    return this.dataSource.transaction(async (manager) => {
      const stageRepo = manager.getRepository(ContentStageEntity);
      const versionRepo = manager.getRepository(ContentVersionEntity);
      const jobRepo = manager.getRepository(ContentGenerationJobEntity);
      const packageRepo = manager.getRepository(ContentPackageEntity);
      const { contentPackage, stage, trackStages } =
        await this.findStageContextOrFail(
          manager,
          input.packageId,
          input.stageId,
        );
      this.assertPackageCanProduce(contentPackage);

      if (!MANUAL_CONTENT_ALLOWED_STATUSES.includes(stage.status)) {
        throw new ResourceConflictException(
          `A etapa não pode receber conteúdo a partir de ${stage.status}`,
        );
      }

      if (!canTransitionContentStage(stage.status, ContentStageStatus.DRAFT)) {
        throw new ResourceConflictException(
          `A etapa não pode voltar para rascunho a partir de ${stage.status}`,
        );
      }

      const versionNumber = await this.nextStageVersionNumber(
        versionRepo,
        stage.id,
      );
      const version = await versionRepo.save(
        versionRepo.create({
          stageId: stage.id,
          versionNumber,
          structuredContent: input.structuredContent,
          contentChecksum: input.contentChecksum,
          templateVersion: input.templateVersion,
          generationSnapshot: input.generationSnapshot,
          createdById: input.createdById,
        }),
      );

      if (input.completedJobId) {
        // Job concluído: vira SUCCEEDED aqui (não é cancelado pelo update abaixo).
        const completed = await jobRepo.update(
          {
            id: input.completedJobId,
            status: ContentGenerationJobStatus.RUNNING,
          },
          {
            status: ContentGenerationJobStatus.SUCCEEDED,
            workerId: null,
            leaseExpiresAt: null,
            heartbeatAt: null,
            errorCode: null,
            errorMessage: null,
          },
        );
        if (!completed.affected) {
          throw new ResourceConflictException(
            "A geração foi cancelada antes de concluir",
          );
        }
      }

      await jobRepo.update(
        {
          stageId: stage.id,
          status: In([...ACTIVE_CONTENT_GENERATION_JOB_STATUSES]),
        },
        {
          status: ContentGenerationJobStatus.CANCELLED,
          workerId: null,
          leaseExpiresAt: null,
          heartbeatAt: null,
        },
      );

      stage.currentVersionId = version.id;
      stage.status = ContentStageStatus.DRAFT;
      await stageRepo.save(stage);

      await this.markDependentStagesStale(
        stageRepo,
        jobRepo,
        stage,
        trackStages,
      );
      await this.movePackageToInProgress(packageRepo, contentPackage);

      return this.findPackageGraphOrFail(packageRepo, contentPackage.id);
    });
  }

  async completeProductionStage(
    input: CompleteContentStageProductionInput,
  ): Promise<ContentPackageEntity> {
    return this.dataSource.transaction(async (manager) => {
      const stageRepo = manager.getRepository(ContentStageEntity);
      const packageRepo = manager.getRepository(ContentPackageEntity);
      const { contentPackage, stage } = await this.findStageContextOrFail(
        manager,
        input.packageId,
        input.stageId,
      );
      this.assertPackageCanProduce(contentPackage);

      if (!stage.currentVersionId) {
        throw new RuleException(
          "A etapa precisa ter uma versão antes de ser concluída",
        );
      }

      if (
        !canTransitionContentStage(
          stage.status,
          ContentStageStatus.PRODUCER_APPROVED,
        )
      ) {
        throw new ResourceConflictException(
          `A etapa não pode ser concluída a partir de ${stage.status}`,
        );
      }

      stage.status = ContentStageStatus.PRODUCER_APPROVED;
      await stageRepo.save(stage);

      const packageGraph = await this.findPackageGraphOrFail(
        packageRepo,
        contentPackage.id,
      );
      if (this.areAllRequiredStagesCompleted(packageGraph)) {
        if (
          canTransitionContentPackage(
            packageGraph.status,
            ContentPackageStatus.PACKAGE_READY,
          )
        ) {
          packageGraph.status = ContentPackageStatus.PACKAGE_READY;
          await packageRepo.save(packageGraph);
        }
      }

      return this.findPackageGraphOrFail(packageRepo, contentPackage.id);
    });
  }

  async submitPackageForReview(
    packageId: string,
  ): Promise<ContentPackageEntity> {
    return this.dataSource.transaction(async (manager) => {
      const packageRepo = manager.getRepository(ContentPackageEntity);
      const stageRepo = manager.getRepository(ContentStageEntity);
      await this.lockPackageOrFail(manager, packageId);
      const contentPackage = await this.findPackageGraphOrFail(
        packageRepo,
        packageId,
      );

      if (
        !canTransitionContentPackage(
          contentPackage.status,
          ContentPackageStatus.IN_REVIEW,
        )
      ) {
        throw new ResourceConflictException(
          `O pacote não pode entrar em revisão a partir de ${contentPackage.status}`,
        );
      }

      const stages = (contentPackage.tracks ?? []).flatMap(
        (track) => track.stages ?? [],
      );
      const requiredStages = stages.filter((stage) => stage.required);
      const allRequiredProduced = requiredStages.every((stage) =>
        COMPLETED_STAGE_STATUSES.includes(stage.status),
      );

      if (!allRequiredProduced) {
        throw new RuleException(
          "Todas as etapas obrigatórias precisam estar concluídas",
        );
      }

      for (const stage of requiredStages) {
        if (
          canTransitionContentStage(stage.status, ContentStageStatus.IN_REVIEW)
        ) {
          stage.status = ContentStageStatus.IN_REVIEW;
          await stageRepo.save(stage);
        }
      }

      contentPackage.status = ContentPackageStatus.IN_REVIEW;
      await packageRepo.save(contentPackage);

      return this.findPackageGraphOrFail(packageRepo, packageId);
    });
  }

  async approveReviewStage(
    input: ApproveContentStageInput,
  ): Promise<ContentPackageEntity> {
    return this.dataSource.transaction(async (manager) => {
      const stageRepo = manager.getRepository(ContentStageEntity);
      const packageRepo = manager.getRepository(ContentPackageEntity);
      const versionRepo = manager.getRepository(ContentVersionEntity);
      const decisionRepo = manager.getRepository(ContentReviewDecisionEntity);
      const { contentPackage, stage } = await this.findStageContextOrFail(
        manager,
        input.packageId,
        input.stageId,
      );
      this.assertPackageCanReview(contentPackage);

      this.assertReviewVersionCurrent(
        stage,
        input.versionId,
        input.lockVersion,
      );

      if (
        !canTransitionContentStage(stage.status, ContentStageStatus.APPROVED)
      ) {
        throw new ResourceConflictException(
          `A etapa não pode ser aprovada a partir de ${stage.status}`,
        );
      }

      const version = await versionRepo.findOne({
        where: { id: input.versionId, stageId: stage.id },
      });
      if (!version) {
        throw new ResourceConflictException(
          "A versão enviada para aprovação não existe mais",
        );
      }
      if (version.contentChecksum !== input.contentChecksum) {
        throw new ResourceConflictException(
          "O checksum da versão de revisão não corresponde",
        );
      }

      stage.status = ContentStageStatus.APPROVED;
      await stageRepo.save(stage);
      await decisionRepo.save(
        decisionRepo.create({
          packageId: contentPackage.id,
          stageId: stage.id,
          versionId: version.id,
          contentChecksum: version.contentChecksum,
          decision: ContentReviewDecisionType.APPROVED,
          reviewerId: input.reviewerId,
          relatedCommentId: null,
          decidedAt: new Date(),
        }),
      );

      const packageGraph = await this.findPackageGraphOrFail(
        packageRepo,
        contentPackage.id,
      );
      if (this.areAllRequiredStagesApproved(packageGraph)) {
        if (
          canTransitionContentPackage(
            packageGraph.status,
            ContentPackageStatus.READY_FOR_PUBLICATION,
          )
        ) {
          packageGraph.status = ContentPackageStatus.READY_FOR_PUBLICATION;
          await packageRepo.save(packageGraph);
        }
      }

      return this.findPackageGraphOrFail(packageRepo, contentPackage.id);
    });
  }

  async requestStageChanges(
    input: RequestContentStageChangesInput,
  ): Promise<ContentPackageEntity> {
    return this.dataSource.transaction(async (manager) => {
      const stageRepo = manager.getRepository(ContentStageEntity);
      const packageRepo = manager.getRepository(ContentPackageEntity);
      const commentRepo = manager.getRepository(ContentReviewCommentEntity);
      const decisionRepo = manager.getRepository(ContentReviewDecisionEntity);
      const versionRepo = manager.getRepository(ContentVersionEntity);
      const { contentPackage, stage } = await this.findStageContextOrFail(
        manager,
        input.packageId,
        input.stageId,
      );
      this.assertPackageCanReview(contentPackage);

      if (!stage.currentVersionId) {
        throw new RuleException(
          "A etapa precisa ter uma versão para receber comentário",
        );
      }

      this.assertReviewVersionCurrent(
        stage,
        input.versionId,
        input.lockVersion,
      );

      if (
        !canTransitionContentStage(
          stage.status,
          ContentStageStatus.CHANGES_REQUESTED,
        )
      ) {
        throw new ResourceConflictException(
          `A etapa não pode receber ajustes a partir de ${stage.status}`,
        );
      }

      const version = await versionRepo.findOne({
        where: { id: input.versionId, stageId: stage.id },
      });
      if (!version) {
        throw new ResourceConflictException(
          "A versão da revisão não existe mais",
        );
      }
      if (version.contentChecksum !== input.contentChecksum) {
        throw new ResourceConflictException(
          "O checksum da versão de revisão não corresponde",
        );
      }

      const reviewComment = await commentRepo.save(
        commentRepo.create({
          packageId: contentPackage.id,
          stageId: stage.id,
          versionId: version.id,
          blockKey: input.blockKey,
          message: input.message,
          authorId: input.authorId,
        }),
      );
      await decisionRepo.save(
        decisionRepo.create({
          packageId: contentPackage.id,
          stageId: stage.id,
          versionId: version.id,
          contentChecksum: version.contentChecksum,
          decision: ContentReviewDecisionType.CHANGES_REQUESTED,
          reviewerId: input.authorId,
          relatedCommentId: reviewComment.id,
          decidedAt: new Date(),
        }),
      );

      stage.status = ContentStageStatus.CHANGES_REQUESTED;
      await stageRepo.save(stage);

      if (
        canTransitionContentPackage(
          contentPackage.status,
          ContentPackageStatus.CHANGES_REQUESTED,
        )
      ) {
        contentPackage.status = ContentPackageStatus.CHANGES_REQUESTED;
        await packageRepo.save(contentPackage);
      }

      return this.findPackageGraphOrFail(packageRepo, contentPackage.id);
    });
  }

  async resolveReviewComment(
    packageId: string,
    commentId: string,
    reviewerId: string,
  ): Promise<ContentPackageEntity> {
    return this.dataSource.transaction(async (manager) => {
      const packageRepo = manager.getRepository(ContentPackageEntity);
      const commentRepo = manager.getRepository(ContentReviewCommentEntity);
      await this.lockPackageOrFail(manager, packageId);
      const comment = await commentRepo.findOne({
        where: { id: commentId, packageId },
        lock: { mode: "pessimistic_write" },
      });
      if (!comment) {
        throw new ResourceNotFoundException(
          "Comentário de revisão não encontrado",
        );
      }
      if (comment.status === ContentReviewCommentStatus.RESOLVED) {
        throw new ResourceConflictException("O comentário já foi resolvido");
      }
      comment.status = ContentReviewCommentStatus.RESOLVED;
      comment.resolvedById = reviewerId;
      comment.resolvedAt = new Date();
      await commentRepo.save(comment);
      return this.findPackageGraphOrFail(packageRepo, packageId);
    });
  }

  async archivePackage(packageId: string): Promise<ContentPackageEntity> {
    return this.dataSource.transaction(async (manager) => {
      const packageRepo = manager.getRepository(ContentPackageEntity);
      await this.lockPackageOrFail(manager, packageId);
      const contentPackage = await this.findPackageGraphOrFail(
        packageRepo,
        packageId,
      );

      if (
        !canTransitionContentPackage(
          contentPackage.status,
          ContentPackageStatus.ARCHIVED,
        )
      ) {
        throw new ResourceConflictException(
          `O pacote não pode ser arquivado a partir de ${contentPackage.status}`,
        );
      }

      const stages = (contentPackage.tracks ?? []).flatMap(
        (track) => track.stages ?? [],
      );
      if (
        stages.some((stage) => stage.status === ContentStageStatus.GENERATING)
      ) {
        throw new ResourceConflictException(
          "O pacote não pode ser arquivado enquanto houver geração em andamento",
        );
      }

      if (!stages.some((stage) => stage.currentVersionId !== null)) {
        throw new RuleException(
          "O pacote não pode ser arquivado antes de possuir conteúdo gerado",
        );
      }

      contentPackage.status = ContentPackageStatus.ARCHIVED;
      contentPackage.archivedAt = new Date();
      await packageRepo.save(contentPackage);

      return this.findPackageGraphOrFail(packageRepo, packageId);
    });
  }

  private applyFilters(
    qb: SelectQueryBuilder<ContentPackageEntity>,
    query: QueryContentPackagesInput,
  ): void {
    if (query.startDate) {
      qb.andWhere("contentPackage.createdAt >= :startDate", {
        startDate: new Date(query.startDate),
      });
    }
    if (query.endDate) {
      const endDate = new Date(query.endDate);
      if (/^\d{4}-\d{2}-\d{2}$/.test(query.endDate)) {
        endDate.setUTCHours(23, 59, 59, 999);
      }
      qb.andWhere("contentPackage.createdAt <= :endDate", { endDate });
    }

    if (query.audience) {
      qb.leftJoin("contentPackage.tracks", "filterTrack").andWhere(
        "filterTrack.audience = :audience",
        { audience: query.audience },
      );
    }

    if (query.status) {
      qb.andWhere("contentPackage.status = :status", { status: query.status });
    }

    if (query.reviewQueue) {
      qb.andWhere("contentPackage.status IN (:...reviewStatuses)", {
        reviewStatuses: [
          ContentPackageStatus.PACKAGE_READY,
          ContentPackageStatus.IN_REVIEW,
          ContentPackageStatus.CHANGES_REQUESTED,
          ContentPackageStatus.READY_FOR_PUBLICATION,
        ],
      });
    }

    const search = query.search?.trim();
    if (search) {
      qb.andWhere(
        "(contentPackage.theme LIKE :search OR contentPackage.biblicalReferences LIKE :search)",
        { search: `%${search}%` },
      );
    }
  }

  private async findStageContextOrFail(
    manager: EntityManager,
    packageId: string,
    stageId: string,
  ): Promise<StageContext> {
    const contentPackage = await manager
      .getRepository(ContentPackageEntity)
      .findOne({
        where: { id: packageId },
        lock: { mode: "pessimistic_write" },
      });

    if (!contentPackage) {
      throw new ResourceNotFoundException("Pacote de conteúdo não encontrado");
    }

    const stageRepo = manager.getRepository(ContentStageEntity);
    const lockedStage = await stageRepo.findOne({
      where: { id: stageId },
      lock: { mode: "pessimistic_write" },
    });

    if (!lockedStage) {
      throw new ResourceNotFoundException("Etapa do pacote não encontrada");
    }

    const stage = await stageRepo.findOne({
      where: { id: stageId },
      relations: { track: { contentPackage: true, stages: true } },
    });

    if (!stage || stage.track.packageId !== packageId) {
      throw new ResourceNotFoundException("Etapa do pacote não encontrada");
    }

    return {
      contentPackage,
      stage,
      trackStages: stage.track.stages ?? [],
    };
  }

  private assertDependenciesReady(
    stage: ContentStageEntity,
    trackStages: readonly ContentStageEntity[],
  ): void {
    for (const dependencyType of stage.dependencies) {
      const dependency = trackStages.find(
        (candidate) => candidate.stageType === dependencyType,
      );

      if (!dependency) {
        throw new RuleException("Dependência de etapa não encontrada", {
          dependencyType,
        });
      }

      if (!DEPENDENCY_READY_STATUSES.includes(dependency.status)) {
        throw new ResourceConflictException(
          "Dependência ainda não está pronta",
          {
            dependencyType,
            status: dependency.status,
          },
        );
      }
    }
  }

  private async nextStageVersionNumber(
    versionRepo: Repository<ContentVersionEntity>,
    stageId: string,
  ): Promise<number> {
    const result = await versionRepo
      .createQueryBuilder("version")
      .select("MAX(version.versionNumber)", "max")
      .where("version.stage_id = :stageId", { stageId })
      .getRawOne<{ max: string | null }>();

    return Number(result?.max ?? 0) + 1;
  }

  private async markDependentStagesStale(
    stageRepo: Repository<ContentStageEntity>,
    jobRepo: Repository<ContentGenerationJobEntity>,
    sourceStage: ContentStageEntity,
    trackStages: readonly ContentStageEntity[],
  ): Promise<void> {
    const invalidatedTypes = new Set<ContentStageType>([sourceStage.stageType]);
    const pending = [...trackStages].sort(
      (left, right) => left.position - right.position,
    );

    for (const dependent of pending) {
      if (dependent.id === sourceStage.id) continue;
      if (!dependent.dependencies.some((type) => invalidatedTypes.has(type)))
        continue;

      invalidatedTypes.add(dependent.stageType);
      const hasActiveGeneration =
        dependent.status === ContentStageStatus.GENERATING;
      if (
        (dependent.currentVersionId || hasActiveGeneration) &&
        canTransitionContentStage(dependent.status, ContentStageStatus.STALE)
      ) {
        if (hasActiveGeneration) {
          await jobRepo.update(
            {
              stageId: dependent.id,
              status: In([...ACTIVE_CONTENT_GENERATION_JOB_STATUSES]),
            },
            {
              status: ContentGenerationJobStatus.CANCELLED,
              workerId: null,
              leaseExpiresAt: null,
              heartbeatAt: null,
            },
          );
        }
        dependent.status = ContentStageStatus.STALE;
        await stageRepo.save(dependent);
      }
    }
  }

  private async movePackageToInProgress(
    packageRepo: Repository<ContentPackageEntity>,
    contentPackage: ContentPackageEntity,
  ): Promise<void> {
    if (
      canTransitionContentPackage(
        contentPackage.status,
        ContentPackageStatus.IN_PROGRESS,
      )
    ) {
      contentPackage.status = ContentPackageStatus.IN_PROGRESS;
      await packageRepo.save(contentPackage);
    }
  }

  private areAllRequiredStagesCompleted(
    contentPackage: ContentPackageEntity,
  ): boolean {
    const stages = (contentPackage.tracks ?? []).flatMap(
      (track) => track.stages ?? [],
    );
    const requiredStages = stages.filter((stage) => stage.required);

    return (
      requiredStages.length > 0 &&
      requiredStages.every((stage) =>
        COMPLETED_STAGE_STATUSES.includes(stage.status),
      )
    );
  }

  private areAllRequiredStagesApproved(
    contentPackage: ContentPackageEntity,
  ): boolean {
    const stages = (contentPackage.tracks ?? []).flatMap(
      (track) => track.stages ?? [],
    );
    const requiredStages = stages.filter((stage) => stage.required);

    return (
      requiredStages.length > 0 &&
      requiredStages.every(
        (stage) => stage.status === ContentStageStatus.APPROVED,
      )
    );
  }

  private assertReviewVersionCurrent(
    stage: ContentStageEntity,
    versionId: string,
    lockVersion: number,
  ): void {
    if (
      stage.currentVersionId !== versionId ||
      stage.lockVersion !== lockVersion
    ) {
      throw new ResourceConflictException(
        "A etapa foi alterada desde que a revisão foi carregada. Atualize e tente novamente.",
      );
    }
  }

  private assertPackageCanProduce(contentPackage: ContentPackageEntity): void {
    if (
      [
        ContentPackageStatus.IN_REVIEW,
        ContentPackageStatus.PUBLISHING,
        ContentPackageStatus.PUBLISHED,
        ContentPackageStatus.ARCHIVED,
      ].includes(contentPackage.status)
    ) {
      throw new ResourceConflictException(
        `O pacote não aceita alterações de produção a partir de ${contentPackage.status}`,
      );
    }
  }

  private assertPackageCanReview(contentPackage: ContentPackageEntity): void {
    if (
      ![
        ContentPackageStatus.IN_REVIEW,
        ContentPackageStatus.CHANGES_REQUESTED,
      ].includes(contentPackage.status)
    ) {
      throw new ResourceConflictException(
        `O pacote não aceita decisões de revisão a partir de ${contentPackage.status}`,
      );
    }
  }

  private async findPackageGraphOrFail(
    packageRepo: Repository<ContentPackageEntity>,
    packageId: string,
  ): Promise<ContentPackageEntity> {
    const contentPackage = await packageRepo.findOne({
      where: { id: packageId },
      relations: {
        tracks: {
          stages: {
            currentVersion: true,
            reviewComments: true,
            reviewDecisions: { version: true },
          },
        },
      },
    });

    if (!contentPackage) {
      throw new ResourceNotFoundException("Pacote de conteúdo não encontrado");
    }

    return contentPackage;
  }

  private async lockPackageOrFail(
    manager: EntityManager,
    packageId: string,
  ): Promise<ContentPackageEntity> {
    const contentPackage = await manager
      .getRepository(ContentPackageEntity)
      .findOne({
        where: { id: packageId },
        lock: { mode: "pessimistic_write" },
      });

    if (!contentPackage) {
      throw new ResourceNotFoundException("Pacote de conteúdo não encontrado");
    }

    return contentPackage;
  }
}
