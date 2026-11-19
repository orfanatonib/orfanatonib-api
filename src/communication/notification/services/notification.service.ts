import { Injectable } from "@nestjs/common";
import { EmailTemplateKey } from "../enums/email-template-key.enum";
import {
  CommentReceivedEmailData,
  PhotoUploadedEmailData,
  FeedCommentApprovedEmailData,
  FeedCommentPendingEmailData,
  FeedCommentRejectedEmailData,
  ContactReceivedEmailData,
  EventNoticeEmailData,
  FeedbackReceivedEmailData,
  PagelaReminderEmailData,
  TeamAssignmentChangedEmailData,
  VisitReportReminderEmailData,
} from "../types";
import {
  DispatchOptions,
  EmailDispatchService,
} from "./email-dispatch.service";

/**
 * A fachada que os módulos de domínio usam. Cada método nomeia um
 * acontecimento do negócio; o template e a entrega ficam abaixo.
 *
 * Antes este serviço montava HTML inline, conhecia as constantes do módulo de
 * eventos e chamava o SMTP direto dentro do request.
 */
@Injectable()
export class NotificationService {
  constructor(private readonly dispatcher: EmailDispatchService) {}

  // ---------------------------------------------------------------- conta

  async sendPasswordResetEmail(
    userEmail: string,
    userName: string,
    resetLink: string,
    ttlMinutes: number,
  ): Promise<void> {
    await this.dispatcher.dispatch(
      EmailTemplateKey.PASSWORD_RESET,
      { userName, resetLink, ttlMinutes },
      [userEmail],
    );
  }

  async sendPasswordChangedEmail(
    userEmail: string,
    userName: string,
  ): Promise<void> {
    await this.dispatcher.dispatch(
      EmailTemplateKey.PASSWORD_CHANGED,
      { userName },
      [userEmail],
    );
  }

  async sendEmailVerification(
    userEmail: string,
    userName: string,
    verificationLink: string,
    ttlHours: number,
  ): Promise<void> {
    await this.dispatcher.dispatch(
      EmailTemplateKey.EMAIL_VERIFICATION,
      { userName, verificationLink, ttlHours },
      [userEmail],
    );
  }

  async sendAccountApproved(
    userEmail: string,
    userName: string,
  ): Promise<void> {
    await this.dispatcher.dispatch(
      EmailTemplateKey.ACCOUNT_APPROVED,
      { userName },
      [userEmail],
    );
  }

  // -------------------------------------------------------------- entrada

  /** Contato pelo site: e-mail para a coordenação. */
  async sendContactNotification(
    contact: ContactReceivedEmailData,
    recipientEmails: readonly string[] = [],
  ): Promise<void> {
    await this.dispatcher.dispatch(
      EmailTemplateKey.CONTACT_RECEIVED,
      contact,
      recipientEmails,
    );
  }

  async sendFeedbackNotification(
    feedback: FeedbackReceivedEmailData,
    recipientEmails: readonly string[],
  ): Promise<void> {
    await this.dispatcher.dispatch(
      EmailTemplateKey.FEEDBACK_RECEIVED,
      feedback,
      recipientEmails,
    );
  }

  async sendCommentNotification(
    comment: CommentReceivedEmailData,
    recipientEmails: readonly string[],
  ): Promise<void> {
    await this.dispatcher.dispatch(
      EmailTemplateKey.COMMENT_RECEIVED,
      comment,
      recipientEmails,
    );
  }

  /** Foto nova no feed de abrigos: avisa a coordenação para revisar. */
  async sendPhotoUploadedNotification(
    photo: PhotoUploadedEmailData,
    recipientEmails: readonly string[],
  ): Promise<void> {
    await this.dispatcher.dispatch(
      EmailTemplateKey.PHOTO_UPLOADED,
      photo,
      recipientEmails,
    );
  }

  /** Comentário novo no feed aguardando moderação: avisa a coordenação. */
  async sendFeedCommentPendingNotification(
    data: FeedCommentPendingEmailData,
    recipientEmails: readonly string[],
  ): Promise<void> {
    await this.dispatcher.dispatch(
      EmailTemplateKey.FEED_COMMENT_PENDING,
      data,
      recipientEmails,
    );
  }

  /** O comentário foi aprovado: avisa o autor. */
  async sendFeedCommentApprovedEmail(
    data: FeedCommentApprovedEmailData,
    authorEmail: string,
  ): Promise<void> {
    await this.dispatcher.dispatch(
      EmailTemplateKey.FEED_COMMENT_APPROVED,
      data,
      [authorEmail],
    );
  }

  /** O comentário foi reprovado: avisa o autor, com o motivo. */
  async sendFeedCommentRejectedEmail(
    data: FeedCommentRejectedEmailData,
    authorEmail: string,
  ): Promise<void> {
    await this.dispatcher.dispatch(
      EmailTemplateKey.FEED_COMMENT_REJECTED,
      data,
      [authorEmail],
    );
  }

  // ------------------------------------------------------------- operação

  /**
   * O módulo de eventos entrega os dados já prontos para o texto — este
   * serviço não conhece mais o enum de ações nem as constantes de lá.
   */
  async sendEventNotification(
    event: EventNoticeEmailData,
    recipientEmails: readonly string[],
  ): Promise<void> {
    await this.dispatcher.dispatch(
      EmailTemplateKey.EVENT_NOTICE,
      event,
      recipientEmails,
    );
  }

  async sendTeamAssignmentChanged(
    userEmail: string,
    data: TeamAssignmentChangedEmailData,
  ): Promise<void> {
    await this.dispatcher.dispatch(
      EmailTemplateKey.TEAM_ASSIGNMENT_CHANGED,
      data,
      [userEmail],
    );
  }

  async sendPagelaReminder(
    userEmail: string,
    data: PagelaReminderEmailData,
    options: DispatchOptions,
  ): Promise<void> {
    await this.dispatcher.dispatch(
      EmailTemplateKey.PAGELA_REMINDER,
      data,
      [userEmail],
      options,
    );
  }

  async sendVisitReportReminder(
    userEmail: string,
    data: VisitReportReminderEmailData,
    options: DispatchOptions,
  ): Promise<void> {
    await this.dispatcher.dispatch(
      EmailTemplateKey.VISIT_REPORT_REMINDER,
      data,
      [userEmail],
      options,
    );
  }

  /** Endereço do frontend, para quem precisa montar um link. */
  appUrl(): string {
    return this.dispatcher.appUrl();
  }
}
