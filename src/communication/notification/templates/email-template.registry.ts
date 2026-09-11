import { EmailTemplateKey } from "../enums/email-template-key.enum";
import {
  EmailRenderContext,
  EmailTemplateDataMap,
  EmailTemplateRegistry,
  RenderedEmail,
} from "../types";
import {
  renderAccountApproved,
  renderEmailVerification,
  renderPasswordChanged,
  renderPasswordReset,
} from "./auth.templates";
import {
  renderCommentReceived,
  renderContactReceived,
  renderFeedbackReceived,
} from "./inbound.templates";
import {
  renderEventNotice,
  renderPagelaReminder,
  renderTeamAssignmentChanged,
  renderVisitReportReminder,
} from "./operations.templates";

/**
 * O catálogo. Cada chave aponta para um renderizador que só aceita os dados
 * declarados em `EmailTemplateDataMap` — passar o payload errado não compila.
 */
export const EMAIL_TEMPLATES: EmailTemplateRegistry = {
  [EmailTemplateKey.PASSWORD_RESET]: renderPasswordReset,
  [EmailTemplateKey.PASSWORD_CHANGED]: renderPasswordChanged,
  [EmailTemplateKey.EMAIL_VERIFICATION]: renderEmailVerification,
  [EmailTemplateKey.ACCOUNT_APPROVED]: renderAccountApproved,
  [EmailTemplateKey.CONTACT_RECEIVED]: renderContactReceived,
  [EmailTemplateKey.EVENT_NOTICE]: renderEventNotice,
  [EmailTemplateKey.FEEDBACK_RECEIVED]: renderFeedbackReceived,
  [EmailTemplateKey.COMMENT_RECEIVED]: renderCommentReceived,
  [EmailTemplateKey.TEAM_ASSIGNMENT_CHANGED]: renderTeamAssignmentChanged,
  [EmailTemplateKey.PAGELA_REMINDER]: renderPagelaReminder,
  [EmailTemplateKey.VISIT_REPORT_REMINDER]: renderVisitReportReminder,
};

export const renderEmail = <TKey extends EmailTemplateKey>(
  key: TKey,
  data: EmailTemplateDataMap[TKey],
  context: EmailRenderContext,
): RenderedEmail => EMAIL_TEMPLATES[key](data, context);

export const EMAIL_TEMPLATE_KEYS = Object.keys(
  EMAIL_TEMPLATES,
) as EmailTemplateKey[];
