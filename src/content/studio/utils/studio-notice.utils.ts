import { ContentPackageEntity } from "../entities/content-package.entity";
import { ContentReviewDecisionEntity } from "../entities/content-review-decision.entity";
import { ContentStageEntity } from "../entities/content-stage.entity";
import { ContentTrackEntity } from "../entities/content-track.entity";
import { ContentReviewDecisionType } from "../enums/content-review-decision-type.enum";
import { ContentStageStatus } from "../enums/content-stage-status.enum";

/** Rótulo do material nos avisos: o tema (a referência bíblica entra quando cabe). */
export function packageNoticeLabel(
  contentPackage: ContentPackageEntity,
): string {
  return contentPackage.theme;
}

export function latestDecision(
  stages: readonly ContentStageEntity[],
  type?: ContentReviewDecisionType,
): ContentReviewDecisionEntity | null {
  let latest: ContentReviewDecisionEntity | null = null;
  for (const stage of stages) {
    for (const decision of stage.reviewDecisions ?? []) {
      if (type && decision.decision !== type) continue;
      if (!latest || decision.decidedAt.getTime() >= latest.decidedAt.getTime())
        latest = decision;
    }
  }
  return latest;
}

/** A categoria já foi devolvida alguma vez: um novo envio dela é um reenvio. */
export function trackWasReturned(track: ContentTrackEntity): boolean {
  return (track.stages ?? []).some((stage) =>
    (stage.reviewDecisions ?? []).some(
      (decision) =>
        decision.decision === ContentReviewDecisionType.CHANGES_REQUESTED,
    ),
  );
}

export function findStage(
  contentPackage: ContentPackageEntity,
  stageId: string,
): { track: ContentTrackEntity; stage: ContentStageEntity } | null {
  for (const track of contentPackage.tracks ?? []) {
    const stage = (track.stages ?? []).find((item) => item.id === stageId);
    if (stage) return { track, stage };
  }
  return null;
}

/** Itens da categoria que a produção entrega (os obrigatórios). */
export function requiredStages(
  track: ContentTrackEntity,
): ContentStageEntity[] {
  return (track.stages ?? []).filter((stage) => stage.required);
}

const PRODUCTION_DONE_STATUSES: readonly ContentStageStatus[] = [
  ContentStageStatus.PRODUCER_APPROVED,
  ContentStageStatus.IN_REVIEW,
  ContentStageStatus.APPROVED,
];

/** Todos os itens obrigatórios da categoria já saíram da produção. */
export function isTrackProductionDone(track: ContentTrackEntity): boolean {
  const required = requiredStages(track);
  return (
    required.length > 0 &&
    required.every((stage) => PRODUCTION_DONE_STATUSES.includes(stage.status))
  );
}
