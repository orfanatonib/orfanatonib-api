import {
  ResourceConflictException,
  RuleException,
} from "src/common/exceptions";

import { CONTENT_PUBLICATION_MESSAGES } from "../constants/content-publication.constants";
import { ContentPackageEntity } from "../entities/content-package.entity";
import { ContentTrackEntity } from "../entities/content-track.entity";
import { isTrackPublished } from "../utils/content-publication-tracks.util";
import { ContentStageEntity } from "../entities/content-stage.entity";
import { ContentPackageStatus } from "../enums/content-package-status.enum";
import { ContentStageStatus } from "../enums/content-stage-status.enum";

const DEPENDENCY_READY_STATUSES: readonly ContentStageStatus[] = [
  ContentStageStatus.DRAFT,
  ContentStageStatus.PRODUCER_APPROVED,
  ContentStageStatus.APPROVED,
] as const;
export const COMPLETED_STAGE_STATUSES: readonly ContentStageStatus[] = [
  ContentStageStatus.PRODUCER_APPROVED,
  ContentStageStatus.APPROVED,
] as const;

/** Situações de um item que já foi para a revisão (aguardando o revisor ou aprovado por ele). */
export const REVIEW_HELD_STAGE_STATUSES: readonly ContentStageStatus[] = [
  ContentStageStatus.IN_REVIEW,
  ContentStageStatus.APPROVED,
] as const;

/**
 * Categoria que já foi para a revisão: nada dela pode ser gerado de novo, a não ser o item que o revisor devolveu
 * (que deixa de estar "concluído pela produção").
 */
export function assertCategoryNotInReview(
  stage: ContentStageEntity,
  trackStages: readonly ContentStageEntity[],
): void {
  if (
    stage.status === ContentStageStatus.PRODUCER_APPROVED &&
    trackStages.some((item) => REVIEW_HELD_STAGE_STATUSES.includes(item.status))
  )
    throw new ResourceConflictException(
      "A categoria está em revisão: só um item devolvido pelo revisor pode ser gerado de novo",
    );
}

export function assertDependenciesReady(
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
      throw new ResourceConflictException("Dependência ainda não está pronta", {
        dependencyType,
        status: dependency.status,
      });
    }
  }
}

export function areAllRequiredStagesCompleted(
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

export function areAllRequiredStagesApproved(
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

export function assertReviewVersionCurrent(
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

export function assertPackageCanProduce(
  contentPackage: ContentPackageEntity,
): void {
  // Em revisão o pacote continua produzível: cada público (trilha) é enviado
  // separadamente e as etapas já enviadas são protegidas pelas transições de etapa.
  if (
    [
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

/**
 * Categoria já publicada em Materiais de Visita fica travada: a página mostra a versão aprovada e publicada, então não
 * se edita, gera, conclui nem reenvia essa categoria.
 */
export function assertTrackNotPublished(
  track: ContentTrackEntity,
  packageStatus: ContentPackageStatus,
): void {
  if (isTrackPublished(track, packageStatus)) {
    throw new ResourceConflictException(
      CONTENT_PUBLICATION_MESSAGES.TRACK_ALREADY_PUBLISHED(track.audienceName),
    );
  }
}

export function assertPackageCanReview(
  contentPackage: ContentPackageEntity,
): void {
  // As categorias são independentes: o pacote pode ter sido rebaixado por uma edição na produção enquanto outra
  // categoria segue em revisão. O guarda real é o status da ETAPA (só IN_REVIEW aceita decisão).
  if (
    [
      ContentPackageStatus.DRAFT,
      ContentPackageStatus.PUBLISHING,
      ContentPackageStatus.PUBLISHED,
      ContentPackageStatus.ARCHIVED,
    ].includes(contentPackage.status)
  ) {
    throw new ResourceConflictException(
      `O pacote não aceita decisões de revisão a partir de ${contentPackage.status}`,
    );
  }
}
