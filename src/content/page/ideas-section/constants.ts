import { MediaType } from "src/shared/media/media-item/media-item.entity";

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
  MEDIA_NOT_IN_SECTION: (title: string): string =>
    `A mídia "${title}" não pertence a esta seção.`,
  MISSING_FILE: (title: string): string =>
    `Arquivo ausente para a mídia "${title}".`,
} as const;

/** Ideia aceita vídeo, documento e imagem; áudio não. */
export const IDEAS_SECTION_ACCEPTED_MEDIA_TYPES: readonly MediaType[] = [
  MediaType.VIDEO,
  MediaType.DOCUMENT,
  MediaType.IMAGE,
];

/**
 * Teto do Multer por requisição de ideia: 10 arquivos de 100 MB (era 200 MB).
 * O armazenamento aplica o teto menor de cada tipo (imagem 10 MB, documento 25 MB).
 */
export const IDEAS_SECTION_UPLOAD_LIMITS = {
  MAX_FILE_BYTES: 100 * 1024 * 1024,
  MAX_FILES: 10,
} as const;
