import { ContentPublicationErrorCode } from "../enums/content-publication-error-code.enum";

/** A PUBLISHING publication older than this is treated as interrupted (no lease: the database is the truth). */
export const CONTENT_PUBLICATION_STALE_AFTER_MS = 10 * 60 * 1000;

export const CONTENT_PUBLICATION_IDEMPOTENCY_KEY_MAX_LENGTH = 191;

/** MySQL duplicate-key error code (unique `idempotencyKey`). */
export const MYSQL_DUPLICATE_ENTRY_CODE = "ER_DUP_ENTRY";

export const CONTENT_PUBLICATION_MESSAGES = {
  PACKAGE_NOT_READY: (status: string): string =>
    `O material só pode ser publicado quando todas as etapas estiverem aprovadas (estado atual: ${status}).`,
  STAGES_NOT_APPROVED:
    "Todas as etapas obrigatórias precisam estar aprovadas na versão atual para publicar.",
  KEY_BELONGS_TO_OTHER_PACKAGE:
    "Esta chave de idempotência já foi usada em outro material.",
} as const;

export const CONTENT_PUBLICATION_ERROR_MESSAGES: Readonly<
  Record<ContentPublicationErrorCode, string>
> = {
  [ContentPublicationErrorCode.DOCUMENT_RENDER_FAILED]:
    "Não foi possível gerar os documentos (DOCX/PDF) do material.",
  [ContentPublicationErrorCode.PAGE_CREATION_FAILED]:
    "Não foi possível criar a página de materiais para visita.",
  [ContentPublicationErrorCode.FINALIZATION_FAILED]:
    "A página foi criada, mas o registro final da publicação falhou.",
  [ContentPublicationErrorCode.INTERRUPTED]:
    "A publicação foi interrompida antes de terminar.",
};

/** Prefix of the synthetic multipart field names used for the generated documents. */
export const CONTENT_PUBLICATION_FIELD_KEY_PREFIX = "studio-doc";
export const CONTENT_PUBLICATION_FULL_PACKAGE_LABEL = "Material completo";
