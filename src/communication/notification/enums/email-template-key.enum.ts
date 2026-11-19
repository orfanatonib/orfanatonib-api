/**
 * Catálogo dos e-mails que a aplicação envia.
 *
 * A chave é o contrato: identifica o template, dá nome à feature flag
 * (`email_<chave>`, com `-` virando `_`) e é gravada no outbox, que é como se audita o que saiu.
 */
export enum EmailTemplateKey {
  PASSWORD_RESET = "password-reset",
  PASSWORD_CHANGED = "password-changed",
  EMAIL_VERIFICATION = "email-verification",
  ACCOUNT_APPROVED = "account-approved",
  CONTACT_RECEIVED = "contact-received",
  EVENT_NOTICE = "event-notice",
  FEEDBACK_RECEIVED = "feedback-received",
  COMMENT_RECEIVED = "comment-received",
  TEAM_ASSIGNMENT_CHANGED = "team-assignment-changed",
  PAGELA_REMINDER = "pagela-reminder",
  VISIT_REPORT_REMINDER = "visit-report-reminder",
  IMAGE_SHARED_NOTIFICATION = "image-shared-notification",
  IMAGE_REJECTED_NOTIFICATION = "image-rejected-notification",
  FEED_COMMENT_PENDING = "feed-comment-pending",
  FEED_COMMENT_APPROVED = "feed-comment-approved",
  FEED_COMMENT_REJECTED = "feed-comment-rejected",
}
