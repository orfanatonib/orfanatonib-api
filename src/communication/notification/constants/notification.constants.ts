export const NOTIFICATION_CONFIG = {
  EMAIL_SEND_INTERVAL_MS: 200,
  /** Endereço do frontend; se ausente, cai no mapa por ambiente abaixo. */
  APP_URL_KEY: "APP_URL",
  /**
   * O logo dos e-mails lia `APP_LOGO_URL`, que não existia em env nenhum —
   * só `CONTACT_EMAIL_LOGO_URL`, usado pelo template de contato. Agora a
   * primeira responde por todos, com a segunda como retrocompatibilidade.
   */
  LOGO_URL_KEY: "APP_LOGO_URL",
  LEGACY_LOGO_URL_KEY: "CONTACT_EMAIL_LOGO_URL",
  LOCAL_ENVIRONMENT: "local",
  STAGING_ENVIRONMENT: "staging",
  PRODUCTION_ENVIRONMENTS: ["prod", "production"] as readonly string[],
  LOCAL_BASE_URL: "http://localhost:5173",
  STAGING_BASE_URL: "https://staging.orfanatonib.com",
  PRODUCTION_BASE_URL: "https://www.orfanatonib.com",
} as const;

/** Fila de saída: tamanho do lote, tentativas e backoff. */
export const OUTBOX_CONFIG = {
  /** Quantos e-mails o worker leva por passada. */
  BATCH_SIZE: 20,
  /** Tentativas antes de marcar como `failed`. */
  MAX_ATTEMPTS: 5,
  /** Espera base do backoff; dobra a cada tentativa. */
  BACKOFF_BASE_SECONDS: 60,
  /** Teto da espera, para uma falha longa não empurrar o envio para semanas. */
  BACKOFF_MAX_SECONDS: 3600,
  /** Tamanho máximo do erro guardado na linha. */
  ERROR_MAX_LENGTH: 1000,
  /** Linhas por INSERT ao registrar os avisos barrados pela flag (cada uma carrega o HTML). */
  SKIPPED_INSERT_CHUNK: 100,
} as const;

/** Janela dos lembretes agendados. */
export const REMINDER_CONFIG = {
  /** Hora local em que os lembretes do dia são avaliados. */
  CRON_HOUR: 9,
  /** Dia da semana do lembrete semanal (1 = segunda). */
  WEEKLY_DAY: 1,
} as const;

export const OutboxLogs = {
  ENQUEUED: (templateKey: string, count: number) =>
    `Outbox: ${count} e-mail(s) enfileirado(s) [${templateKey}]`,
  SKIPPED_BY_FLAG: (templateKey: string) =>
    `Outbox: envio desligado pela feature flag [${templateKey}]`,
  DUPLICATE: (dedupeKey: string) =>
    `Outbox: já existe um e-mail com a chave ${dedupeKey}, ignorando`,
  NO_RECIPIENTS: (templateKey: string) =>
    `Outbox: nenhum destinatário para [${templateKey}]`,
  BATCH_START: (count: number) => `Outbox: processando ${count} e-mail(s)`,
  SENT: (id: string) => `Outbox: e-mail ${id} enviado`,
  RETRY: (id: string, attempt: number) =>
    `Outbox: e-mail ${id} falhou (tentativa ${attempt}), reagendado`,
  GAVE_UP: (id: string, attempts: number) =>
    `Outbox: e-mail ${id} desistiu após ${attempts} tentativas`,
  REQUEUED: (count: number) => `Outbox: ${count} e-mail(s) devolvido(s) à fila`,
} as const;

export const NotificationLogs = {
  PASSWORD_RESET_SENT: "Password reset email sent",
  PASSWORD_RESET_ERROR: "Error sending password reset email",
  PASSWORD_CHANGED_SENT: "Password changed email sent",
  PASSWORD_CHANGED_ERROR: "Error sending password changed email",
  CONTACT_EMAIL_SENT: "Contact email sent successfully",
  CONTACT_EMAIL_ERROR: "Error sending contact email",
  CONTACT_EMAIL_RECIPIENTS_MISSING:
    "No recipients provided for contact email notification",
} as const;
