export const FEED_COMMENT_MAX_LENGTH = 500;
export const FEED_COMMENT_MIN_LENGTH = 1;
export const FEED_COMMENT_DEFAULT_PAGE_SIZE = 10;
export const FEED_COMMENT_MAX_PAGE_SIZE = 50;
export const FEED_COMMENT_REASON_MAX_LENGTH = 500;
export const FEED_COMMENT_SEARCH_MAX_LENGTH = 120;

/** Antispam: cada envio pendente vira e-mail para a coordenação. */
export const FEED_COMMENT_RATE_WINDOW_MS = 60_000;
export const FEED_COMMENT_RATE_LIMIT = 5;

/** Trecho do comentário no e-mail enviado ao próprio autor. */
export const FEED_COMMENT_EMAIL_EXCERPT_LENGTH = 160;

export const FEED_COMMENT_SECTIONS_ROUTE = "feed-sections";
export const FEED_COMMENT_ITEMS_ROUTE = "feed-section-comments";

export const FEED_COMMENT_UNKNOWN_AUTHOR_LABEL = "Participante";

export const FEED_COMMENT_MESSAGES = {
  EMPTY: "Escreva um comentário.",
  TOO_LONG: `O comentário pode ter no máximo ${FEED_COMMENT_MAX_LENGTH} caracteres.`,
  NOT_FOUND: "Comentário não encontrado.",
  FORBIDDEN_DELETE: "Você só pode remover os seus próprios comentários.",
  SENSITIVE_DATA:
    "Por proteção das crianças e famílias, não publique telefone, e-mail, endereço ou links nos comentários.",
  INVALID_SESSION: "Sessão inválida.",
  REASON_REQUIRED: "Informe o motivo da reprovação.",
  REASON_TOO_LONG: `O motivo pode ter no máximo ${FEED_COMMENT_REASON_MAX_LENGTH} caracteres.`,
  REQUEST_REUSED: "Este envio já foi usado para outro comentário.",
  RATE_LIMITED:
    "Você enviou vários comentários. Aguarde um minuto antes de tentar novamente.",
  ALREADY_DECIDED:
    "Este comentário já foi moderado. Atualize a lista antes de continuar.",
} as const;
