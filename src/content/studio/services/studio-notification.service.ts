import { Injectable } from "@nestjs/common";

import { CreateInboxNotificationService } from "src/communication/inbox/services/create-inbox-notification.service";
import { InboxNotificationSource } from "src/communication/inbox/enums/inbox-notification-source.enum";
import { InboxNotificationTargetKind } from "src/communication/inbox/enums/inbox-notification-target-kind.enum";
import { InboxNotificationType } from "src/communication/inbox/enums/inbox-notification-type.enum";
import { InboxNoticeInput } from "src/communication/inbox/types";

import { ContentPackageEntity } from "../entities/content-package.entity";
import { ContentTrackEntity } from "../entities/content-track.entity";
import { ContentAudience } from "../enums/content-audience.enum";
import { ContentReviewDecisionType } from "../enums/content-review-decision-type.enum";
import { ContentStageStatus } from "../enums/content-stage-status.enum";
import { ContentPackagesRepository } from "../repositories/content-packages.repository";
import {
  findStage,
  isTrackProductionDone,
  latestDecision,
  packageNoticeLabel,
  trackWasReturned,
} from "../utils/studio-notice.utils";

/**
 * Avisos do sininho para os administradores a partir dos eventos do Estúdio Orfanato. Cada método é de melhor
 * esforço (o serviço de caixa de entrada nunca lança) e usa uma chave de evento estável para não duplicar.
 */
@Injectable()
export class StudioNotificationService {
  constructor(
    private readonly inbox: CreateInboxNotificationService,
    private readonly packages: ContentPackagesRepository,
  ) {}

  private notice(
    contentPackage: ContentPackageEntity,
    type: InboxNotificationType,
    dedupeKey: string,
    extra: Pick<InboxNoticeInput, "targetAudience" | "targetStage" | "actorId">,
  ): Promise<number> {
    return this.inbox.notifyAdmins({
      source: InboxNotificationSource.ORFANATO_STUDIO,
      type,
      targetKind: InboxNotificationTargetKind.STUDIO_PACKAGE,
      targetId: contentPackage.id,
      label: packageNoticeLabel(contentPackage),
      dedupeKey,
      ...extra,
    });
  }

  /** Categorias enviadas (ou reenviadas depois de um ajuste) para a revisão. */
  async submitted(
    contentPackage: ContentPackageEntity,
    audiences: readonly ContentAudience[] | undefined,
    actorId: string | undefined,
  ): Promise<void> {
    const tracks = (contentPackage.tracks ?? []).filter(
      (track) =>
        (!audiences?.length || audiences.includes(track.audience)) &&
        (track.stages ?? []).some(
          (stage) => stage.status === ContentStageStatus.IN_REVIEW,
        ),
    );
    await Promise.all(
      tracks.map((track) =>
        this.trackSubmitted(contentPackage, track, actorId),
      ),
    );
  }

  private trackSubmitted(
    contentPackage: ContentPackageEntity,
    track: ContentTrackEntity,
    actorId: string | undefined,
  ): Promise<number> {
    const submitted = latestDecision(
      track.stages ?? [],
      ContentReviewDecisionType.SUBMITTED,
    );
    const type = trackWasReturned(track)
      ? InboxNotificationType.RESUBMITTED_FOR_REVIEW
      : InboxNotificationType.SUBMITTED_FOR_REVIEW;
    return this.notice(
      contentPackage,
      type,
      `studio:${type}:${contentPackage.id}:${track.audience}:${submitted?.id ?? "-"}`,
      { targetAudience: track.audience, actorId },
    );
  }

  /** O revisor pediu ajuste num item. */
  async changesRequested(
    contentPackage: ContentPackageEntity,
    stageId: string,
    actorId: string,
  ): Promise<void> {
    const found = findStage(contentPackage, stageId);
    if (!found) return;
    const decision = latestDecision(
      [found.stage],
      ContentReviewDecisionType.CHANGES_REQUESTED,
    );
    await this.notice(
      contentPackage,
      InboxNotificationType.CHANGES_REQUESTED,
      `studio:${InboxNotificationType.CHANGES_REQUESTED}:${stageId}:${decision?.id ?? "-"}`,
      {
        targetAudience: found.track.audience,
        targetStage: found.stage.stageType,
        actorId,
      },
    );
  }

  /** O revisor aprovou um item. */
  async approved(
    contentPackage: ContentPackageEntity,
    stageId: string,
    actorId: string,
  ): Promise<void> {
    const found = findStage(contentPackage, stageId);
    if (!found) return;
    const decision = latestDecision(
      [found.stage],
      ContentReviewDecisionType.APPROVED,
    );
    await this.notice(
      contentPackage,
      InboxNotificationType.STAGE_APPROVED,
      `studio:${InboxNotificationType.STAGE_APPROVED}:${stageId}:${decision?.id ?? "-"}`,
      {
        targetAudience: found.track.audience,
        targetStage: found.stage.stageType,
        actorId,
      },
    );
  }

  /**
   * A produção terminou um item. Item devolvido que volta sozinho para a revisão vira "reenviado"; item comum só
   * avisa quando fecha a categoria (senão cada item concluído encheria o sino).
   */
  async productionCompleted(
    contentPackage: ContentPackageEntity,
    stageId: string,
    actorId: string | undefined,
  ): Promise<void> {
    const found = findStage(contentPackage, stageId);
    if (!found) return;
    if (found.stage.status === ContentStageStatus.IN_REVIEW) {
      const decision = latestDecision(
        [found.stage],
        ContentReviewDecisionType.SUBMITTED,
      );
      await this.notice(
        contentPackage,
        InboxNotificationType.RESUBMITTED_FOR_REVIEW,
        `studio:${InboxNotificationType.RESUBMITTED_FOR_REVIEW}:${stageId}:${decision?.id ?? "-"}`,
        {
          targetAudience: found.track.audience,
          targetStage: found.stage.stageType,
          actorId,
        },
      );
      return;
    }
    if (!isTrackProductionDone(found.track)) return;
    await this.notice(
      contentPackage,
      InboxNotificationType.PRODUCTION_COMPLETED,
      `studio:${InboxNotificationType.PRODUCTION_COMPLETED}:${contentPackage.id}:${found.track.audience}:${found.stage.currentVersionId ?? "-"}`,
      { targetAudience: found.track.audience, actorId },
    );
  }

  /** Item devolvido que voltou para a revisão porque a produção resolveu a última observação. */
  async resolvedAndReturned(
    contentPackage: ContentPackageEntity,
    stageId: string,
    actorId: string,
  ): Promise<void> {
    const found = findStage(contentPackage, stageId);
    if (!found || found.stage.status !== ContentStageStatus.IN_REVIEW) return;
    const decision = latestDecision(
      [found.stage],
      ContentReviewDecisionType.SUBMITTED,
    );
    await this.notice(
      contentPackage,
      InboxNotificationType.RESUBMITTED_FOR_REVIEW,
      `studio:${InboxNotificationType.RESUBMITTED_FOR_REVIEW}:${stageId}:${decision?.id ?? "-"}`,
      {
        targetAudience: found.track.audience,
        targetStage: found.stage.stageType,
        actorId,
      },
    );
  }

  /** Categorias publicadas em Materiais de Visita. */
  async published(
    packageId: string,
    audiences: readonly string[],
    publicationId: string,
    actorId: string,
  ): Promise<void> {
    const label = await this.packages.findThemeById(packageId);
    await Promise.all(
      audiences.map((audience) =>
        this.inbox.notifyAdmins({
          source: InboxNotificationSource.ORFANATO_STUDIO,
          type: InboxNotificationType.PUBLISHED,
          targetKind: InboxNotificationTargetKind.STUDIO_PACKAGE,
          targetId: packageId,
          label: label ?? "",
          targetAudience: audience,
          actorId,
          dedupeKey: `studio:${InboxNotificationType.PUBLISHED}:${publicationId}:${audience}`,
        }),
      ),
    );
  }

  /** Fim (ou falha definitiva) de uma geração por IA. */
  async generationFinished(
    packageId: string,
    jobId: string,
    failed: boolean,
    actorId: string | undefined,
  ): Promise<void> {
    const type = failed
      ? InboxNotificationType.GENERATION_FAILED
      : InboxNotificationType.GENERATION_COMPLETED;
    const label = await this.packages.findThemeById(packageId);
    await this.inbox.notifyAdmins({
      source: InboxNotificationSource.ORFANATO_STUDIO,
      type,
      targetKind: InboxNotificationTargetKind.STUDIO_PACKAGE,
      targetId: packageId,
      label: label ?? "",
      actorId,
      dedupeKey: `studio:${type}:${jobId}`,
    });
  }
}
