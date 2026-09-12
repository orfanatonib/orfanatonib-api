/** Campo multipart que carrega o JSON da seção. */
export const IDEAS_SECTION_PAYLOAD_FIELD = "sectionData";

/**
 * `media_items.title` e `media_items.description` são `NOT NULL` sem default,
 * mas o payload os declara opcionais. Sem estes padrões, qualquer seção com
 * mídia morria no insert com "Field 'description' doesn't have a default
 * value" — o que derrubava a criação inteira.
 */
export const IDEAS_SECTION_MEDIA_DEFAULTS = {
  TITLE: "Sem título",
  DESCRIPTION: "",
} as const;

export const IDEAS_SECTION_MESSAGES = {
  UNAUTHENTICATED: "Sessão inválida.",
  PAYLOAD_REQUIRED: `O campo "${IDEAS_SECTION_PAYLOAD_FIELD}" é obrigatório.`,
  INVALID_PAYLOAD: "Dados inválidos na requisição.",
  SECTION_NOT_FOUND: "Seção de ideias não encontrada.",
  PAGE_NOT_FOUND: "Página de ideias não encontrada.",
  ALREADY_ATTACHED: "Esta seção já está vinculada a uma página.",
  ATTACHED_CANNOT_DELETE:
    "Seção vinculada a uma página. Desvincule ou remova a página primeiro.",
  MISSING_FIELD_KEY: (title: string): string =>
    `fieldKey ausente para a mídia "${title}".`,
  MISSING_FILE: (title: string): string =>
    `Arquivo ausente para a mídia "${title}".`,
} as const;
