import { MediaType } from "src/shared/media/media-item/media-item.entity";

/** Multipart field carrying the JSON payload of the page. */
export const VISIT_MATERIAL_PAYLOAD_FIELD = "visitMaterialsPageData";
export const VISIT_MATERIAL_NON_BLANK_PATTERN = /\S/;

/** Route metadata generated for every visit material page. */
export const VISIT_MATERIAL_ROUTE_PATH_PREFIX = "materiais_visita_";
export const VISIT_MATERIAL_ROUTE_ENTITY_TYPE = "VisitMaterialsPage";
export const VISIT_MATERIAL_ROUTE_CARD_IMAGE_URL =
  "https://orfanatos-nib-storage.s3.us-east-1.amazonaws.com/aux/card_materiais.png";

/**
 * The four media buckets the page exposes, in the order they are persisted and
 * returned. Keeping it as data is what lets one routine serve every bucket.
 */
export const VISIT_MATERIAL_MEDIA_TYPES = [
  MediaType.VIDEO,
  MediaType.DOCUMENT,
  MediaType.IMAGE,
  MediaType.AUDIO,
] as const;

export const VISIT_MATERIAL_MESSAGES = {
  PAYLOAD_REQUIRED: `O campo "${VISIT_MATERIAL_PAYLOAD_FIELD}" é obrigatório.`,
  INVALID_PAYLOAD: "Dados inválidos na requisição.",
  PAGE_NOT_FOUND: "Página de materiais não encontrada.",
  MEDIA_NOT_FOUND: "Mídia da página de materiais não encontrada.",
  ROUTE_NOT_FOUND: "Rota da página de materiais não encontrada.",
  ID_MISMATCH: "O id do corpo deve ser igual ao id da rota.",
  LINK_URL_REQUIRED: (title: string): string =>
    `URL ausente para o item de mídia "${title}".`,
  CREATE_FAILED: "Erro ao criar a página de materiais.",
  UPDATE_FAILED: "Erro ao atualizar a página de materiais.",
  DELETE_FAILED: "Erro ao remover a página de materiais.",
  DUPLICATE_CATEGORY: (category: string): string =>
    `A categoria "${category}" aparece mais de uma vez na página.`,
  SECTION_ALREADY_EXISTS: (category: string): string =>
    `A página já tem a seção da categoria "${category}"; ela não é alterada ao acrescentar seções.`,
  APPEND_FAILED: "Erro ao acrescentar as seções à página de materiais.",
  MISSING_FIELD_KEY: (title: string): string =>
    `fieldKey ausente para o item de mídia "${title}".`,
  MISSING_FILE: (title: string): string =>
    `Arquivo ausente para o item de mídia "${title}".`,
} as const;
