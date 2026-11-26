import { EntityManager, In, Repository } from "typeorm";

import { ResourceNotFoundException } from "src/common/exceptions";

import { ContentGenerationJobEntity } from "../entities/content-generation-job.entity";
import { ContentPackageEntity } from "../entities/content-package.entity";
import { ContentStageEntity } from "../entities/content-stage.entity";
import { ContentVersionEntity } from "../entities/content-version.entity";
import { ContentGenerationJobStatus } from "../enums/content-generation-job-status.enum";
import { ContentPackageStatus } from "../enums/content-package-status.enum";
import { ContentStageStatus } from "../enums/content-stage-status.enum";
import { ContentStageType } from "../enums/content-stage-type.enum";
import { ACTIVE_CONTENT_GENERATION_JOB_STATUSES } from "../types";
import { REVIEW_HELD_STAGE_STATUSES } from "./content-package-rules.helpers";
import { workingPackageStatus } from "../utils/content-publication-tracks.util";
import {
  canTransitionContentPackage,
  canTransitionContentStage,
} from "../utils/content-state-transition.util";

export type StageContext = {
  readonly contentPackage: ContentPackageEntity;
  readonly stage: ContentStageEntity;
  readonly trackStages: ContentStageEntity[];
};

export async function findStageContextOrFail(
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

export async function nextStageVersionNumber(
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

/**
 * Marca como desatualizados os itens que vêm depois do item alterado. Edição manual: só os que dependem dele
 * (direta ou indiretamente). Geração nova (`allLaterStages`): TODOS os itens seguintes da categoria, pela ordem —
 * gerar de novo o item 2 devolve o 3, o 4 e o 5 para a produção; gerar o 4 devolve só o 5.
 */
export async function markDependentStagesStale(
  stageRepo: Repository<ContentStageEntity>,
  jobRepo: Repository<ContentGenerationJobEntity>,
  sourceStage: ContentStageEntity,
  trackStages: readonly ContentStageEntity[],
  allLaterStages = false,
): Promise<void> {
  const invalidatedTypes = new Set<ContentStageType>([sourceStage.stageType]);
  const pending = [...trackStages].sort(
    (left, right) => left.position - right.position,
  );

  for (const dependent of pending) {
    if (dependent.id === sourceStage.id) continue;
    if (
      allLaterStages
        ? dependent.position <= sourceStage.position ||
          // Item que já está com a revisão não volta para a produção por causa de outro item gerado de novo.
          REVIEW_HELD_STAGE_STATUSES.includes(dependent.status)
        : !dependent.dependencies.some((type) => invalidatedTypes.has(type))
    )
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

/**
 * A produção mexeu em um item: o pacote assume a situação das categorias ainda não publicadas (em geral "em produção",
 * mas continua "pronto para publicar" ou "em revisão" se outra categoria está nesse ponto). Antes ele ia SEMPRE para
 * "em produção", o que tirava da fila de revisão uma categoria já aprovada só porque outra estava sendo produzida.
 */
export async function movePackageToInProgress(
  packageRepo: Repository<ContentPackageEntity>,
  contentPackage: ContentPackageEntity,
): Promise<void> {
  const graph = await findPackageGraphOrFail(packageRepo, contentPackage.id);
  const target = workingPackageStatus(graph.tracks ?? [], graph.status);
  if (
    graph.status !== target &&
    canTransitionContentPackage(graph.status, target)
  ) {
    contentPackage.status = target;
    await packageRepo.save(contentPackage);
  }
}

export async function findPackageGraphOrFail(
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

export async function lockPackageOrFail(
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
