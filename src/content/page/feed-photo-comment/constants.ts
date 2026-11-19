export const FEED_COMMENT_MAX_LENGTH = 500;
export const FEED_COMMENT_MIN_LENGTH = 1;
export const FEED_COMMENT_DEFAULT_PAGE_SIZE = 10;
export const FEED_COMMENT_MAX_PAGE_SIZE = 50;

export const FEED_COMMENT_SECTIONS_ROUTE = "feed-sections";
export const FEED_COMMENT_ITEMS_ROUTE = "feed-section-comments";

export const FEED_COMMENT_MESSAGES = {
  EMPTY: "Escreva um comentário.",
  TOO_LONG: `O comentário pode ter no máximo ${FEED_COMMENT_MAX_LENGTH} caracteres.`,
  NOT_FOUND: "Comentário não encontrado.",
  FORBIDDEN_DELETE: "Você só pode remover os seus próprios comentários.",
  SENSITIVE_DATA:
    "Por proteção das crianças e famílias, não publique telefone, e-mail, endereço ou links nos comentários.",
  INVALID_SESSION: "Sessão inválida.",
} as const;
