import { Injectable } from "@nestjs/common";
import { DataSource, In } from "typeorm";

import { ResourceConflictException } from "src/common/exceptions";

import { CONTENT_STUDIO_CATALOG_VERSION } from "../constants";
import type { StageGenerationContext } from "../ai/generation/stage-prompt.builder";
import { ContentGenerationJobEntity } from "../entities/content-generation-job.entity";
import { ContentPackageEntity } from "../entities/content-package.entity";
import { ContentStageEntity } from "../entities/content-stage.entity";
import { ContentVersionEntity } from "../entities/content-version.entity";
import { ContentGenerationJobStatus } from "../enums/content-generation-job-status.enum";
import { ContentStageStatus } from "../enums/content-stage-status.enum";
import { ContentStageType } from "../enums/content-stage-type.enum";
import {
  ACTIVE_CONTENT_GENERATION_JOB_STATUSES,
  FailGenerationJobInput,
  RequestContentStageGenerationInput,
  StartedGenerationJob,
} from "../types";
import { canTransitionContentStage } from "../utils/content-state-transition.util";
import {
  findStageContextOrFail,
  movePackageToInProgress,
} from "./content-package-graph.helpers";
import {
  assertDependenciesReady,
  assertPackageCanProduce,
} from "./content-package-rules.helpers";

@Injectable()
export class ContentGenerationRepository {
  constructor(private readonly dataSource: DataSource) {}

  async requestStageGeneration(
    input: RequestContentStageGenerationInput,
  ): Promise<ContentGenerationJobEntity> {
    return this.dataSource.transaction(async (manager) => {
      const jobRepo = manager.getRepository(ContentGenerationJobEntity);
      const stageRepo = manager.getRepository(ContentStageEntity);
      const packageRepo = manager.getRepository(ContentPackageEntity);
      const { contentPackage, stage, trackStages } =
        await findStageContextOrFail(manager, input.packageId, input.stageId);
      assertPackageCanProduce(contentPackage);

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

      assertDependenciesReady(stage, trackStages);

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
      await movePackageToInProgress(packageRepo, contentPackage);

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
      await findStageContextOrFail(manager, packageId, stageId);
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
      const { stage } = await findStageContextOrFail(
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
}
