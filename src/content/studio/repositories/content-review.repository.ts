import { Injectable } from "@nestjs/common";
import { DataSource } from "typeorm";

import {
  ResourceConflictException,
  ResourceNotFoundException,
  RuleException,
} from "src/common/exceptions";

import { ContentPackageEntity } from "../entities/content-package.entity";
import { ContentReviewCommentEntity } from "../entities/content-review-comment.entity";
import { ContentReviewDecisionEntity } from "../entities/content-review-decision.entity";
import { ContentStageEntity } from "../entities/content-stage.entity";
import { ContentVersionEntity } from "../entities/content-version.entity";
import { ContentPackageStatus } from "../enums/content-package-status.enum";
import { ContentReviewCommentStatus } from "../enums/content-review-comment-status.enum";
import { ContentReviewDecisionType } from "../enums/content-review-decision-type.enum";
import { ContentStageStatus } from "../enums/content-stage-status.enum";
import {
  ApproveContentStageInput,
  RequestContentStageChangesInput,
} from "../types";
import {
  canTransitionContentPackage,
  canTransitionContentStage,
} from "../utils/content-state-transition.util";
import {
  findPackageGraphOrFail,
  findStageContextOrFail,
  lockPackageOrFail,
} from "./content-package-graph.helpers";
import {
  COMPLETED_STAGE_STATUSES,
  areAllRequiredStagesApproved,
  assertPackageCanReview,
  assertReviewVersionCurrent,
} from "./content-package-rules.helpers";

@Injectable()
export class ContentReviewRepository {
  constructor(private readonly dataSource: DataSource) {}

  async submitPackageForReview(
    packageId: string,
  ): Promise<ContentPackageEntity> {
    return this.dataSource.transaction(async (manager) => {
      const packageRepo = manager.getRepository(ContentPackageEntity);
      const stageRepo = manager.getRepository(ContentStageEntity);
      await lockPackageOrFail(manager, packageId);
      const contentPackage = await findPackageGraphOrFail(
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

      return findPackageGraphOrFail(packageRepo, packageId);
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
      const { contentPackage, stage } = await findStageContextOrFail(
        manager,
        input.packageId,
        input.stageId,
      );
      assertPackageCanReview(contentPackage);

      assertReviewVersionCurrent(stage, input.versionId, input.lockVersion);

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

      const packageGraph = await findPackageGraphOrFail(
        packageRepo,
        contentPackage.id,
      );
      if (areAllRequiredStagesApproved(packageGraph)) {
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

      return findPackageGraphOrFail(packageRepo, contentPackage.id);
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
      const { contentPackage, stage } = await findStageContextOrFail(
        manager,
        input.packageId,
        input.stageId,
      );
      assertPackageCanReview(contentPackage);

      if (!stage.currentVersionId) {
        throw new RuleException(
          "A etapa precisa ter uma versão para receber comentário",
        );
      }

      assertReviewVersionCurrent(stage, input.versionId, input.lockVersion);

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

      return findPackageGraphOrFail(packageRepo, contentPackage.id);
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
      await lockPackageOrFail(manager, packageId);
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
      return findPackageGraphOrFail(packageRepo, packageId);
    });
  }
}
