import {
  ResourceConflictException,
  RuleException,
} from "src/common/exceptions";

import { ContentPackageEntity } from "../entities/content-package.entity";
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

export function assertPackageCanReview(
  contentPackage: ContentPackageEntity,
): void {
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
