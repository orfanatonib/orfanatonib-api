export const REDACTED = "[REDACTED]";

/** Chaves cujo valor nunca vai para log/auditoria (comparação sem caixa e sem separadores). */
const SENSITIVE_KEYS = new Set(
  [
    "password",
    "newpassword",
    "currentpassword",
    "token",
    "accesstoken",
    "refreshtoken",
    "authorization",
    "cookie",
    "secret",
    "apikey",
    "idtoken",
    "credential",
    "cpf",
    "phone",
    "email",
    "birthdate",
    "address",
  ].map(normalizeKey),
);

function normalizeKey(key: string): string {
  return key.toLowerCase().replace(/[^a-z0-9]/g, "");
}

const JWT_PATTERN =
  /\beyJ[A-Za-z0-9_-]{5,}\.[A-Za-z0-9_-]{5,}\.[A-Za-z0-9_-]*\b/g;
const BEARER_PATTERN = /\bBearer\s+[A-Za-z0-9._~+/=-]+/gi;
const EMAIL_PATTERN = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;
const CPF_PATTERN = /\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/g;
const PHONE_PATTERN = /(?:\+?55\s?)?\(?\d{2}\)?\s?9?\d{4}-?\d{4}\b/g;

/** Redige padrões sensíveis dentro de um texto livre (mensagem de erro, stack). */
export function redactText(text: string): string {
  return text
    .replace(JWT_PATTERN, REDACTED)
    .replace(BEARER_PATTERN, `Bearer ${REDACTED}`)
    .replace(EMAIL_PATTERN, REDACTED)
    .replace(CPF_PATTERN, REDACTED)
    .replace(PHONE_PATTERN, REDACTED);
}

/** Caminho da requisição sem query string (que pode carregar token/e-mail). */
export function stripQueryString(url: string): string {
  const index = url.indexOf("?");
  return index === -1 ? url : url.slice(0, index);
}

const MAX_DEPTH = 6;

/** Cópia profunda com as chaves sensíveis mascaradas e os textos redigidos. */
export function redactValue(value: unknown, depth = 0): unknown {
  if (depth > MAX_DEPTH) return REDACTED;
  if (typeof value === "string") return redactText(value);
  if (Array.isArray(value))
    return value.map((item) => redactValue(item, depth + 1));
  if (value instanceof Error)
    return { name: value.name, message: redactText(value.message) };
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, inner] of Object.entries(
      value as Record<string, unknown>,
    )) {
      out[key] = SENSITIVE_KEYS.has(normalizeKey(key))
        ? REDACTED
        : redactValue(inner, depth + 1);
    }
    return out;
  }
  return value;
}

/** Parâmetros de rota que podem aparecer como `resourceId` na auditoria (UUIDs, nunca texto livre). */
export const SAFE_RESOURCE_ID_PARAMS: readonly string[] = [
  "id",
  "shelterId",
  "teamId",
  "shelteredId",
  "leaderId",
  "memberId",
  "pageId",
  "key",
  "eventId",
  "packageId",
  "stageId",
  "jobId",
];

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const FLAG_KEY_PATTERN = /^[a-z0-9_-]{1,64}$/;

/** `resourceId` seguro: só param permitido e só se for UUID (ou chave simples de flag). */
export function pickResourceId(
  params: Record<string, string | undefined>,
): string | undefined {
  for (const name of SAFE_RESOURCE_ID_PARAMS) {
    const value = params[name];
    if (
      value &&
      (UUID_PATTERN.test(value) ||
        (name === "key" && FLAG_KEY_PATTERN.test(value)))
    ) {
      return value;
    }
  }
  return undefined;
}
