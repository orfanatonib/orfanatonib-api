import { ContentPublicationErrorCode } from "../enums/content-publication-error-code.enum";
import { ContentStageType } from "../enums/content-stage-type.enum";

/** A PUBLISHING publication older than this is treated as interrupted (no lease: the database is the truth). */
export const CONTENT_PUBLICATION_STALE_AFTER_MS = 10 * 60 * 1000;

export const CONTENT_PUBLICATION_IDEMPOTENCY_KEY_MAX_LENGTH = 191;

/** MySQL duplicate-key error code (unique `idempotencyKey`). */
export const MYSQL_DUPLICATE_ENTRY_CODE = "ER_DUP_ENTRY";

export const CONTENT_PUBLICATION_MESSAGES = {
  PACKAGE_NOT_READY: (status: string): string =>
    `O material só pode ser publicado quando ao menos uma categoria estiver com todas as etapas aprovadas (estado atual: ${status}).`,
  STAGES_NOT_APPROVED:
    "Nenhuma categoria está com todas as etapas obrigatórias aprovadas na versão atual e ainda sem publicar.",
  TRACK_ALREADY_PUBLISHED: (audienceName: string): string =>
    `A categoria ${audienceName} já foi publicada e não pode mais ser alterada.`,
  KEY_BELONGS_TO_OTHER_PACKAGE:
    "Esta chave de idempotência já foi usada em outro material.",
} as const;

export const CONTENT_PUBLICATION_ERROR_MESSAGES: Readonly<
  Record<ContentPublicationErrorCode, string>
> = {
  [ContentPublicationErrorCode.DOCUMENT_RENDER_FAILED]:
    "Não foi possível gerar os PDFs do material.",
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

/** Nome de cada item como aparece na página publicada (um PDF por item). */
export const CONTENT_PUBLICATION_STAGE_LABELS: Readonly<
  Record<ContentStageType, string>
> = {
  [ContentStageType.LESSON]: "Lição",
  [ContentStageType.LESSON_VISUALS]: "Visuais da lição",
  [ContentStageType.VERSE_VISUALS]: "Visual do versículo",
  [ContentStageType.VERSE_FIXATION]: "Fixação divertida do versículo",
  [ContentStageType.STANDARD_GAME]: "Brincadeira divertida",
};
