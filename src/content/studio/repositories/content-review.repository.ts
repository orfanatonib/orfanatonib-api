import { Injectable } from "@nestjs/common";
import { DataSource } from "typeorm";

import {
  ResourceConflictException,
  ResourceNotFoundException,
  RuleException,
} from "src/common/exceptions";

import { ContentAudience } from "../enums/content-audience.enum";
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
import { isReadyForPublication } from "../utils/content-publication-tracks.util";
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
  assertPackageCanReview,
  assertTrackNotPublished,
  assertReviewVersionCurrent,
} from "./content-package-rules.helpers";

/**
 * Situações em que NÃO se envia mais nada para a revisão. Todas as outras valem (a decisão é por categoria): usar uma
 * lista do que vale esquecia estados (ex.: com uma categoria pronta para publicar, o botão de enviar as demais sumia).
 */
const NOT_SUBMITTABLE_PACKAGE_STATUSES: readonly ContentPackageStatus[] = [
  ContentPackageStatus.PUBLISHING,
  ContentPackageStatus.PUBLISHED,
  ContentPackageStatus.ARCHIVED,
];

/** Etapas que já estão prontas (ou já enviadas) para a revisão do público. */
const REVIEWABLE_STAGE_STATUSES: readonly ContentStageStatus[] = [
  ContentStageStatus.PRODUCER_APPROVED,
  ContentStageStatus.IN_REVIEW,
  ContentStageStatus.APPROVED,
];

/** Autor registrado quando o envio não vem de um usuário autenticado (rotinas e testes). */
const SYSTEM_ACTOR_ID = "system";

@Injectable()
export class ContentReviewRepository {
  constructor(private readonly dataSource: DataSource) {}

  /**
   * Envia para revisão um ou mais públicos (trilhas) do material. Sem `audiences`,
   * envia todos. Cada trilha enviada precisa ter todas as etapas obrigatórias
   * concluídas; as demais continuam em produção.
   */
  async submitPackageForReview(
    packageId: string,
    audiences?: readonly ContentAudience[],
    actorId: string = SYSTEM_ACTOR_ID,
  ): Promise<ContentPackageEntity> {
    return this.dataSource.transaction(async (manager) => {
      const packageRepo = manager.getRepository(ContentPackageEntity);
      const stageRepo = manager.getRepository(ContentStageEntity);
      const decisionRepo = manager.getRepository(ContentReviewDecisionEntity);
      await lockPackageOrFail(manager, packageId);
      const contentPackage = await findPackageGraphOrFail(
        packageRepo,
        packageId,
      );

      if (NOT_SUBMITTABLE_PACKAGE_STATUSES.includes(contentPackage.status)) {
        throw new ResourceConflictException(
          `O pacote não pode ser enviado para revisão a partir de ${contentPackage.status}`,
        );
      }

      const tracks = contentPackage.tracks ?? [];
      const selected = audiences?.length
        ? tracks.filter((track) => audiences.includes(track.audience))
        : tracks;
      if (audiences?.length && selected.length !== new Set(audiences).size) {
        throw new RuleException("Categoria inexistente neste material");
      }

      const toSubmit: ContentStageEntity[] = [];
      for (const track of selected) {
        assertTrackNotPublished(track, contentPackage.status);
        const required = (track.stages ?? []).filter((stage) => stage.required);
        const pending = required.find(
          (stage) => !REVIEWABLE_STAGE_STATUSES.includes(stage.status),
        );
        if (pending) {
          throw new RuleException(
            `Conclua a etapa "${pending.stageType}" de ${track.audienceName} antes de enviar para revisão`,
            { audience: track.audience, stageType: pending.stageType },
          );
        }
        toSubmit.push(
          ...required.filter((stage) =>
            COMPLETED_STAGE_STATUSES.includes(stage.status),
          ),
        );
      }
      if (toSubmit.length === 0) {
        throw new RuleException("Não há etapas concluídas para enviar");
      }

      for (const stage of toSubmit) {
        if (
          canTransitionContentStage(stage.status, ContentStageStatus.IN_REVIEW)
        ) {
          stage.status = ContentStageStatus.IN_REVIEW;
          await stageRepo.save(stage);
          // Histórico: cada envio (e reenvio, depois de um ajuste) fica registrado com a versão enviada.
          if (stage.currentVersionId) {
            await decisionRepo.save(
              decisionRepo.create({
                packageId,
                stageId: stage.id,
                versionId: stage.currentVersionId,
                contentChecksum: stage.currentVersion?.contentChecksum ?? "",
                decision: ContentReviewDecisionType.SUBMITTED,
                reviewerId: actorId,
                relatedCommentId: null,
                decidedAt: new Date(),
              }),
            );
          }
        }
      }

      // Com uma categoria já aprovada e ainda não publicada o pacote segue publicável (as outras seguem em revisão).
      const graph = await findPackageGraphOrFail(packageRepo, packageId);
      const target = isReadyForPublication(graph.tracks ?? [], graph.status)
        ? ContentPackageStatus.READY_FOR_PUBLICATION
        : ContentPackageStatus.IN_REVIEW;
      if (
        contentPackage.status !== target &&
        canTransitionContentPackage(contentPackage.status, target)
      ) {
        contentPackage.status = target;
        await packageRepo.save(contentPackage);
      }

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
      // Publicação por categoria: basta uma categoria aprovada e ainda não publicada.
      if (
        isReadyForPublication(packageGraph.tracks ?? [], packageGraph.status)
      ) {
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

      // Devolver uma categoria não esconde as que já estão aprovadas e prontas para a página.
      const graph = await findPackageGraphOrFail(
        packageRepo,
        contentPackage.id,
      );
      const target = isReadyForPublication(graph.tracks ?? [], graph.status)
        ? ContentPackageStatus.READY_FOR_PUBLICATION
        : ContentPackageStatus.CHANGES_REQUESTED;
      if (
        contentPackage.status !== target &&
        canTransitionContentPackage(contentPackage.status, target)
      ) {
        contentPackage.status = target;
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
