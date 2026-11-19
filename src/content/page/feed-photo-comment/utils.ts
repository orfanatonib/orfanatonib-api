import {
  FEED_COMMENT_EMAIL_EXCERPT_LENGTH,
  FEED_COMMENT_MESSAGES,
} from "./constants";
import { RuleException } from "src/common/exceptions";

// eslint-disable-next-line no-control-regex
const CONTROL_CHARS = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g;
const EMAIL_PATTERN = /[^\s@]+@[^\s@]+\.[^\s@]+/;
const LINK_PATTERN = /(https?:\/\/|www\.)\S+/i;
/** 8+ dígitos (com ou sem separadores) = telefone/documento. */
const LONG_DIGIT_RUN_PATTERN = /(?:\d[\s().-]?){8,}/;

/** Normaliza o texto: sem caracteres de controle, espaços colapsados, sem pontas. */
export const normalizeCommentContent = (raw: string): string =>
  raw
    .replace(CONTROL_CHARS, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

/** `true` quando o texto traz e-mail, telefone/documento ou link. */
export const containsSensitiveData = (content: string): boolean =>
  EMAIL_PATTERN.test(content) ||
  LINK_PATTERN.test(content) ||
  LONG_DIGIT_RUN_PATTERN.test(content);

/**
 * Normaliza e valida o conteúdo. Lança 400 se vazio ou se expõe dado pessoal
 * (política de privacidade do feed: fotos de abrigo com crianças).
 */
export const prepareCommentContent = (raw: string): string => {
  const content = normalizeCommentContent(raw);
  if (content.length === 0) {
    throw new RuleException(FEED_COMMENT_MESSAGES.EMPTY);
  }
  if (containsSensitiveData(content)) {
    throw new RuleException(FEED_COMMENT_MESSAGES.SENSITIVE_DATA);
  }
  return content;
};

/** Só o autor remove o seu; admin remove qualquer um. */
export const canDeleteComment = (
  authorId: string | null,
  actor: { userId: string; isAdmin: boolean },
): boolean => actor.isAdmin || (authorId !== null && authorId === actor.userId);

/** Aparar espaços de texto livre vindo do corpo/consulta (`@Transform`). */
export const trimText = ({ value }: { value: unknown }): unknown =>
  typeof value === "string" ? value.trim() : value;

/** Trecho do comentário para o e-mail do autor (sem quebras de linha). */
export const toEmailExcerpt = (content: string): string => {
  const flat = content.replace(/\s+/g, " ").trim();
  return flat.length > FEED_COMMENT_EMAIL_EXCERPT_LENGTH
    ? `${flat.slice(0, FEED_COMMENT_EMAIL_EXCERPT_LENGTH - 1)}…`
    : flat;
};

/** Erro de chave duplicada do MySQL (corrida no `UNIQUE(authorId, requestId)`). */
export const isDuplicateEntryError = (error: unknown): boolean =>
  typeof error === "object" &&
  error !== null &&
  "code" in error &&
  (error as { code?: unknown }).code === "ER_DUP_ENTRY";
