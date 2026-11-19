import { AiProviderErrorKind } from "../enums/ai-provider-error-kind.enum";

export interface ProviderHttpError {
  status: number;
  /** Código ou status textual do provedor (`rate_limit_exceeded`, `RESOURCE_EXHAUSTED`...). */
  code?: string | number;
  message?: string;
}

const text = (error: ProviderHttpError): string =>
  `${error.code ?? ""} ${error.message ?? ""}`.toLowerCase();

/**
 * Tradução ÚNICA de resposta HTTP de provedor para o tipo de erro do Estúdio. Antes cada
 * gateway tinha a sua e todo 4xx desconhecido virava `SCHEMA` (que parece culpa do conteúdo).
 */
export function classifyProviderHttpError(
  error: ProviderHttpError,
): AiProviderErrorKind {
  const { status } = error;
  const detail = text(error);

  if (status === 401 || status === 403)
    return AiProviderErrorKind.AUTHENTICATION;
  if (status === 408) return AiProviderErrorKind.TIMEOUT;
  if (status === 429) {
    return detail.includes("quota") && !detail.includes("per minute")
      ? AiProviderErrorKind.QUOTA
      : AiProviderErrorKind.RATE_LIMIT;
  }
  if (status >= 500) return AiProviderErrorKind.SERVER;

  if (detail.includes("moderation") || detail.includes("safety"))
    return AiProviderErrorKind.SAFETY;
  if (
    status === 404 ||
    detail.includes("model_not_found") ||
    /model .*(not found|does not exist)/.test(detail)
  )
    return AiProviderErrorKind.NOT_FOUND_MODEL;
  if (
    detail.includes("context_length") ||
    detail.includes("maximum context") ||
    detail.includes("too many tokens") ||
    status === 413
  )
    return AiProviderErrorKind.CONTEXT_LENGTH;
  if (detail.includes("schema")) return AiProviderErrorKind.SCHEMA;

  return AiProviderErrorKind.INVALID_REQUEST;
}
