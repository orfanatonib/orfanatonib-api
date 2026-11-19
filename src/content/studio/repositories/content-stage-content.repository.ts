import { Injectable } from "@nestjs/common";
import { DataSource, In } from "typeorm";

import {
  ResourceConflictException,
  RuleException,
} from "src/common/exceptions";

import { ContentGenerationJobEntity } from "../entities/content-generation-job.entity";
import { ContentPackageEntity } from "../entities/content-package.entity";
import { ContentStageEntity } from "../entities/content-stage.entity";
import { ContentVersionEntity } from "../entities/content-version.entity";
import { ContentGenerationJobStatus } from "../enums/content-generation-job-status.enum";
import { ContentPackageStatus } from "../enums/content-package-status.enum";
import { ContentStageStatus } from "../enums/content-stage-status.enum";
import {
  ACTIVE_CONTENT_GENERATION_JOB_STATUSES,
  CompleteContentStageProductionInput,
  SaveContentStageVersionInput,
} from "../types";
import {
  canTransitionContentPackage,
  canTransitionContentStage,
} from "../utils/content-state-transition.util";
import {
  findPackageGraphOrFail,
  findStageContextOrFail,
  markDependentStagesStale,
  movePackageToInProgress,
  nextStageVersionNumber,
} from "./content-package-graph.helpers";
import {
  areAllRequiredStagesCompleted,
  assertPackageCanProduce,
} from "./content-package-rules.helpers";

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

@Injectable()
export class ContentStageContentRepository {
  constructor(private readonly dataSource: DataSource) {}

  async saveStageContent(
    input: SaveContentStageVersionInput,
  ): Promise<ContentPackageEntity> {
    return this.dataSource.transaction(async (manager) => {
      const stageRepo = manager.getRepository(ContentStageEntity);
      const versionRepo = manager.getRepository(ContentVersionEntity);
      const jobRepo = manager.getRepository(ContentGenerationJobEntity);
      const packageRepo = manager.getRepository(ContentPackageEntity);
      const { contentPackage, stage, trackStages } =
        await findStageContextOrFail(manager, input.packageId, input.stageId);
      assertPackageCanProduce(contentPackage);

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

      const versionNumber = await nextStageVersionNumber(versionRepo, stage.id);
      const version = await versionRepo.save(
        versionRepo.create({
          stageId: stage.id,
          versionNumber,
          structuredContent: input.structuredContent,
          contentDocument: input.contentDocument ?? null,
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

      await markDependentStagesStale(stageRepo, jobRepo, stage, trackStages);
      await movePackageToInProgress(packageRepo, contentPackage);

      return findPackageGraphOrFail(packageRepo, contentPackage.id);
    });
  }

  async completeProductionStage(
    input: CompleteContentStageProductionInput,
  ): Promise<ContentPackageEntity> {
    return this.dataSource.transaction(async (manager) => {
      const stageRepo = manager.getRepository(ContentStageEntity);
      const packageRepo = manager.getRepository(ContentPackageEntity);
      const { contentPackage, stage } = await findStageContextOrFail(
        manager,
        input.packageId,
        input.stageId,
      );
      assertPackageCanProduce(contentPackage);

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

      const packageGraph = await findPackageGraphOrFail(
        packageRepo,
        contentPackage.id,
      );
      if (areAllRequiredStagesCompleted(packageGraph)) {
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

      return findPackageGraphOrFail(packageRepo, contentPackage.id);
    });
  }
}
