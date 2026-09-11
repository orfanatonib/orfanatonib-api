import type { SignOptions } from "jsonwebtoken";
import {
  AUTH_BEARER_SCHEME,
  AUTH_TOKEN_COOKIE_KEYS,
  AUTH_TOKEN_QUERY_KEY,
} from "../constants/auth.constants";
import { RequestTokenCarriers } from "../types";
import { UserRole } from "../auth.types";

const firstString = (
  source: Record<string, unknown> | undefined,
  keys: readonly string[],
): string | null => {
  if (!source) return null;

  for (const key of keys) {
    const value = source[key];
    if (typeof value === "string" && value.length > 0) return value;
  }
  return null;
};

/**
 * O token pode chegar no header, num cookie ou na query — esta última usada
 * por links de download que o navegador abre sem passar pelo axios.
 */
export const extractBearerToken = (
  request: RequestTokenCarriers,
): string | null => {
  const header =
    request.headers?.authorization ?? request.headers?.Authorization;

  if (typeof header === "string") {
    // Split por espaço simples deixava "Bearer  token" (dois espaços) sem token.
    const [scheme, token] = header.trim().split(/\s+/);
    if (scheme?.toLowerCase() === AUTH_BEARER_SCHEME && token) {
      return token;
    }
  }

  return (
    firstString(request.cookies, AUTH_TOKEN_COOKIE_KEYS) ??
    firstString(request.query, [AUTH_TOKEN_QUERY_KEY])
  );
};

const ROLE_BY_VALUE: Readonly<Record<string, UserRole>> = {
  [UserRole.ADMIN]: UserRole.ADMIN,
  [UserRole.MEMBER]: UserRole.MEMBER,
  [UserRole.LEADER]: UserRole.LEADER,
};

/** Papel do token normalizado; o que não for conhecido vira `undefined`. */
export const normalizeRole = (
  role: UserRole | string | undefined | null,
): UserRole | undefined => {
  if (!role) return undefined;
  return ROLE_BY_VALUE[String(role).toLowerCase()];
};

/** `true` quando alguma das dicas aparece na mensagem do erro. */
export const messageMatches = (
  message: string,
  hints: readonly string[],
): boolean => hints.some((hint) => message.includes(hint));

/** Mensagem de um `unknown` vindo de `catch`, sem `any`. */
export const errorMessageOf = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

/**
 * `JWT_*_EXPIRES_IN` chega do ambiente como texto ("7d", "3600"), mas o
 * `jsonwebtoken` tipa `expiresIn` como um literal (`StringValue`) que nenhuma
 * variável de ambiente satisfaz. O estreitamento fica isolado aqui — era um
 * `as any` repetido no módulo e na emissão do refresh.
 */
export const toExpiresIn = (value: string): SignOptions["expiresIn"] =>
  value as SignOptions["expiresIn"];
