import { EntityManager } from "typeorm";

import { ContentPackageEntity } from "../entities/content-package.entity";
import { ContentReviewCommentEntity } from "../entities/content-review-comment.entity";
import { ContentReviewDecisionEntity } from "../entities/content-review-decision.entity";
import { ContentStageEntity } from "../entities/content-stage.entity";
import { ContentPackageStatus } from "../enums/content-package-status.enum";
import { ContentReviewCommentStatus } from "../enums/content-review-comment-status.enum";
import { ContentReviewDecisionType } from "../enums/content-review-decision-type.enum";
import { ContentStageStatus } from "../enums/content-stage-status.enum";
import { isReadyForPublication } from "../utils/content-publication-tracks.util";
import { canTransitionContentPackage } from "../utils/content-state-transition.util";
import { findPackageGraphOrFail } from "./content-package-graph.helpers";

/**
 * Devolve para a revisão um item que o revisor tinha devolvido: o item volta a "em revisão", o reenvio entra no
 * histórico (ligado à observação) e o status do pacote é recalculado. Não faz nada se ainda houver observação aberta.
 * Devolve `true` quando o item voltou.
 */
export async function returnStageToReview(
  manager: EntityManager,
  stage: ContentStageEntity,
  packageId: string,
  actorId: string,
  relatedCommentId: string | null,
): Promise<boolean> {
  if (!stage.currentVersionId) return false;
  const stillOpen = await manager
    .getRepository(ContentReviewCommentEntity)
    .count({
      where: { stageId: stage.id, status: ContentReviewCommentStatus.OPEN },
    });
  if (stillOpen > 0) return false;

  const decisionRepo = manager.getRepository(ContentReviewDecisionEntity);
  stage.status = ContentStageStatus.IN_REVIEW;
  await manager.getRepository(ContentStageEntity).save(stage);
  await decisionRepo.save(
    decisionRepo.create({
      packageId,
      stageId: stage.id,
      versionId: stage.currentVersionId,
      contentChecksum: stage.currentVersion?.contentChecksum ?? "",
      decision: ContentReviewDecisionType.SUBMITTED,
      reviewerId: actorId,
      relatedCommentId,
      decidedAt: new Date(),
    }),
  );

  const packageRepo = manager.getRepository(ContentPackageEntity);
  const contentPackage = await findPackageGraphOrFail(packageRepo, packageId);
  const hasReturned = (contentPackage.tracks ?? [])
    .flatMap((track) => track.stages ?? [])
    .some((item) => item.status === ContentStageStatus.CHANGES_REQUESTED);
  const target = isReadyForPublication(
    contentPackage.tracks ?? [],
    contentPackage.status,
  )
    ? ContentPackageStatus.READY_FOR_PUBLICATION
    : hasReturned
      ? ContentPackageStatus.CHANGES_REQUESTED
      : ContentPackageStatus.IN_REVIEW;
  if (
    contentPackage.status !== target &&
    canTransitionContentPackage(contentPackage.status, target)
  ) {
    contentPackage.status = target;
    await packageRepo.save(contentPackage);
  }
  return true;
}
