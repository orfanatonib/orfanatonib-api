export const EMAIL_CONFIG_KEYS = {
  GMAIL_USER: "GMAIL_SMTP_USER",
  GMAIL_APP_PASSWORD: "GMAIL_SMTP_APP_PASSWORD",
  FROM_NAME: "EMAIL_FROM_NAME",
} as const;

export const GMAIL_SMTP_CONFIG = {
  HOST: "smtp.gmail.com",
  PORT: 465,
  SECURE: true,
  CONNECTION_TIMEOUT_MS: 10_000,
  GREETING_TIMEOUT_MS: 10_000,
  SOCKET_TIMEOUT_MS: 20_000,
  MAX_ATTEMPTS: 3,
  RETRY_DELAY_MS: 250,
} as const;

export const EMAIL_DEFAULTS = {
  FROM_NAME: "Orfanatos NIB",
} as const;

export const EMAIL_ERROR_MESSAGES = {
  DELIVERY_FAILED:
    "Não foi possível enviar o e-mail. Tente novamente mais tarde.",
  REQUIRED_CONFIG: (key: string) =>
    `Configuração obrigatória de e-mail ausente: ${key}`,
} as const;

export const RETRYABLE_SMTP_ERROR_CODES: readonly string[] = [
  "EAI_AGAIN",
  "ECONNECTION",
  "ECONNREFUSED",
  "ECONNRESET",
  "ESOCKET",
  "ETIMEDOUT",
];
