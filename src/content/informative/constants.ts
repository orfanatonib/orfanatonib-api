/** Texto com ao menos um caractere visível: "   " passa em `@IsNotEmpty` mas não é conteúdo. */
export const INFORMATIVE_NON_BLANK_PATTERN = /\S/;

/** `informatives.title` é varchar(255): acima disso o banco recusaria DEPOIS de o pedido ser aceito. */
export const INFORMATIVE_LIMITS = {
  titleMax: 255,
} as const;

/** Prefixo do caminho da rota de cada banner (`informativo_<titulo>`). */
export const INFORMATIVE_ROUTE_PREFIX = "informativo_";
