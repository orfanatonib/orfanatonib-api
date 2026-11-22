/** Texto com ao menos um caractere visível: "   " passa em `@IsNotEmpty` mas não é conteúdo. */
export const SITE_FEEDBACK_NON_BLANK_PATTERN = /\S/;

export const SITE_FEEDBACK_LIMITS = {
  nameMax: 100,
  emailMax: 255,
  commentMax: 5000,
  ratingMin: 1,
  ratingMax: 5,
} as const;
