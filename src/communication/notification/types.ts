import { EmailTemplateKey } from "./enums/email-template-key.enum";

/** O que um template produz. O `text` é obrigatório: cliente sem HTML existe. */
export interface RenderedEmail {
  readonly subject: string;
  readonly html: string;
  readonly text: string;
}

/** Contexto que todo template recebe além dos seus próprios dados. */
export interface EmailRenderContext {
  readonly appUrl: string;
  readonly logoUrl?: string;
}

export interface PasswordResetEmailData {
  userName: string;
  resetLink: string;
  ttlMinutes: number;
}

export interface PasswordChangedEmailData {
  userName: string;
}

export interface EmailVerificationEmailData {
  userName: string;
  verificationLink: string;
  ttlHours: number;
}

export interface AccountApprovedEmailData {
  userName: string;
}

export interface ContactReceivedEmailData {
  name: string;
  email: string;
  phone: string;
  message: string;
}

export interface EventNoticeEmailData {
  title: string;
  date: string;
  location?: string;
  description?: string;
  /** "criado", "atualizado", "cancelado" — já no passado, como vai no texto. */
  actionLabel: string;
  subjectLine: string;
}

export interface FeedbackReceivedEmailData {
  name?: string;
  email?: string;
  rating?: number;
  comment: string;
}

export interface CommentReceivedEmailData {
  authorName: string;
  clubinho?: string;
  neighborhood?: string;
  comment: string;
}

/** Foto(s) nova(s) enviada(s) para o feed de abrigos; sem dado de criança. */
export interface PhotoUploadedEmailData {
  caption: string;
  photoCount: number;
}

/** Comentário novo aguardando moderação; sem o texto, que pode ter dado de criança/família. */
export interface FeedCommentPendingEmailData {
  authorName: string;
  postCaption: string;
}

/** Decisão sobre o comentário, enviada ao próprio autor (o texto é dele). */
export interface FeedCommentApprovedEmailData {
  userName: string;
  commentExcerpt: string;
  postCaption: string;
}

export interface FeedCommentRejectedEmailData
  extends FeedCommentApprovedEmailData {
  reason: string;
}

export interface TeamAssignmentChangedEmailData {
  userName: string;
  shelterName: string;
  teamNumber: number;
  /** `true` quando entrou na equipe, `false` quando saiu. */
  assigned: boolean;
}

export interface PagelaReminderEmailData {
  userName: string;
  shelterName: string;
  referenceLabel: string;
  pendingCount: number;
}

export interface VisitReportReminderEmailData {
  userName: string;
  shelterName: string;
  referenceLabel: string;
}

/**
 * A ligação entre a chave e os dados que o template dela exige. É o que faz
 * `notify(EmailTemplateKey.PASSWORD_RESET, { ... })` não compilar com o payload
 * de outro e-mail.
 */
export interface EmailTemplateDataMap {
  [EmailTemplateKey.PASSWORD_RESET]: PasswordResetEmailData;
  [EmailTemplateKey.PASSWORD_CHANGED]: PasswordChangedEmailData;
  [EmailTemplateKey.EMAIL_VERIFICATION]: EmailVerificationEmailData;
  [EmailTemplateKey.ACCOUNT_APPROVED]: AccountApprovedEmailData;
  [EmailTemplateKey.CONTACT_RECEIVED]: ContactReceivedEmailData;
  [EmailTemplateKey.EVENT_NOTICE]: EventNoticeEmailData;
  [EmailTemplateKey.FEEDBACK_RECEIVED]: FeedbackReceivedEmailData;
  [EmailTemplateKey.COMMENT_RECEIVED]: CommentReceivedEmailData;
  [EmailTemplateKey.TEAM_ASSIGNMENT_CHANGED]: TeamAssignmentChangedEmailData;
  [EmailTemplateKey.PAGELA_REMINDER]: PagelaReminderEmailData;
  [EmailTemplateKey.VISIT_REPORT_REMINDER]: VisitReportReminderEmailData;
  [EmailTemplateKey.PHOTO_UPLOADED]: PhotoUploadedEmailData;
  [EmailTemplateKey.FEED_COMMENT_PENDING]: FeedCommentPendingEmailData;
  [EmailTemplateKey.FEED_COMMENT_APPROVED]: FeedCommentApprovedEmailData;
  [EmailTemplateKey.FEED_COMMENT_REJECTED]: FeedCommentRejectedEmailData;
}

export type EmailTemplateRenderer<TKey extends EmailTemplateKey> = (
  data: EmailTemplateDataMap[TKey],
  context: EmailRenderContext,
) => RenderedEmail;

export type EmailTemplateRegistry = {
  readonly [TKey in EmailTemplateKey]: EmailTemplateRenderer<TKey>;
};

/** Um e-mail já renderizado e pronto para a fila. */
export interface OutboxEnqueueInput {
  readonly templateKey: EmailTemplateKey;
  readonly recipients: readonly string[];
  readonly rendered: RenderedEmail;
  /** Evita duplicata: a mesma chave não é enfileirada duas vezes. */
  readonly dedupeKey?: string;
  readonly scheduledFor?: Date;
}
