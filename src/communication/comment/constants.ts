export const COMMENT_MESSAGES = {
  NOT_FOUND: "Comment not found",
} as const;

/** Texto com ao menos um caractere visível: "   " passa em `@IsNotEmpty` mas não é conteúdo. */
export const COMMENT_NON_BLANK_PATTERN = /\S/;

export const COMMENT_LIMITS = {
  nameMax: 100,
  commentMax: 2000,
  shelterMax: 100,
  neighborhoodMax: 100,
} as const;
