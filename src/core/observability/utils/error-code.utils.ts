import { HttpException } from "@nestjs/common";

/**
 * Códigos estáveis de erro que a auditoria e o painel reconhecem. No Orfanato
 * o código viaja em `details.code` (como `FEATURE_DISABLED`), não em uma classe
 * própria: as exceções de domínio continuam as de `src/common/exceptions`.
 */
export const LOG_ERROR_CODES = {
  INVALID_DATE_RANGE: "VAL_4005",
  RESOURCE_NOT_FOUND: "RES_5001",
  INTERNAL_ERROR: "INT_9001",
  LOG_QUERY_UNAVAILABLE: "LOG_9101",
} as const;

/** `details.code` de uma exceção HTTP do domínio, quando houver. */
export function errorCodeOf(error: unknown): string | null {
  if (!(error instanceof HttpException)) return null;
  const body = error.getResponse();
  if (typeof body !== "object" || body === null) return null;
  const details = (body as { details?: unknown }).details;
  if (typeof details !== "object" || details === null) return null;
  const code = (details as { code?: unknown }).code;
  return typeof code === "string" ? code : null;
}
