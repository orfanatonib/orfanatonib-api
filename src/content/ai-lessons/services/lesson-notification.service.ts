import { Injectable, Logger } from "@nestjs/common";
import { CreateInboxNotificationService } from "src/communication/inbox/services/create-inbox-notification.service";
import { InboxNotificationSource } from "src/communication/inbox/enums/inbox-notification-source.enum";
import { InboxNotificationTargetKind } from "src/communication/inbox/enums/inbox-notification-target-kind.enum";
import { InboxNotificationType } from "src/communication/inbox/enums/inbox-notification-type.enum";
import { LessonStageType } from "../enums/lesson.enums";
import { LessonWorkflowAction } from "../enums/lesson-failure-code.enum";
import { AiLessonsRepository } from "../repositories/ai-lessons.repository";

/** Só estas ações do fluxo viram aviso no sininho (as demais são ruído para quem não está produzindo). */
const ACTION_NOTICE_TYPES: Readonly<
  Partial<Record<LessonWorkflowAction, InboxNotificationType>>
> = {
  [LessonWorkflowAction.SUBMIT_PACKAGE]:
    InboxNotificationType.SUBMITTED_FOR_REVIEW,
  [LessonWorkflowAction.APPROVE_STAGE]: InboxNotificationType.STAGE_APPROVED,
  [LessonWorkflowAction.REQUEST_CHANGES]:
    InboxNotificationType.CHANGES_REQUESTED,
  [LessonWorkflowAction.PUBLISH]: InboxNotificationType.PUBLISHED,
};

export interface LessonNoticeDetails {
  stage?: LessonStageType;
  versionId?: string;
  commentId?: string;
}

/**
 * Avisos do sininho para os administradores a partir do fluxo do Estúdio Clubinho. De melhor esforço: nunca lança
 * e nunca atrasa a ação que o originou (quem chama não espera).
 */
@Injectable()
export class LessonNotificationService {
  private readonly logger = new Logger(LessonNotificationService.name);

  constructor(
    private readonly repo: AiLessonsRepository,
    private readonly inbox: CreateInboxNotificationService,
  ) {}

  /** Ação do fluxo concluída (chamada pelo mesmo ponto que registra a trilha de auditoria). */
  async workflow(
    action: LessonWorkflowAction,
    lessonId: string,
    actorId: string | undefined,
    details: LessonNoticeDetails = {},
  ): Promise<void> {
    const type = ACTION_NOTICE_TYPES[action];
    if (!type) return;
    // Sem id estável do evento, a chave leva o instante: cada ação executada é um evento distinto.
    const event = details.versionId ?? details.commentId ?? Date.now();
    await this.send(lessonId, type, actorId, details.stage ?? null, [
      action,
      lessonId,
      details.stage ?? "-",
      String(event),
    ]);
  }

  /** Fim (ou falha) de uma geração por IA de um item da lição. */
  async generationFinished(
    lessonId: string,
    stage: LessonStageType,
    failed: boolean,
    actorId?: string,
  ): Promise<void> {
    await this.send(
      lessonId,
      failed
        ? InboxNotificationType.GENERATION_FAILED
        : InboxNotificationType.GENERATION_COMPLETED,
      actorId,
      stage,
      [
        failed ? "GENERATION_FAILED" : "GENERATION_COMPLETED",
        lessonId,
        stage,
        String(Date.now()),
      ],
    );
  }

  private async send(
    lessonId: string,
    type: InboxNotificationType,
    actorId: string | undefined,
    stage: string | null,
    keyParts: readonly string[],
  ): Promise<void> {
    try {
      const lesson = await this.repo.findLessonById(lessonId);
      await this.inbox.notifyAdmins({
        source: InboxNotificationSource.CLUBINHO_LESSONS,
        type,
        targetKind: InboxNotificationTargetKind.CLUBINHO_LESSON,
        targetId: lessonId,
        label: lesson?.theme ?? "",
        targetStage: stage,
        actorId: actorId ?? null,
        dedupeKey: `lesson:${type}:${keyParts.join(":")}`,
      });
    } catch (error: unknown) {
      this.logger.warn(
        `Aviso ${type} da lição ${lessonId} não foi criado: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}
