import type { CorsOptions } from "@nestjs/common/interfaces/external/cors-options.interface";

export interface ParsedOrigins {
  origins: string[];
  invalid: string[];
}

/** Normaliza uma origem (`https://app.exemplo.com`), sem caminho nem barra final. */
function normalizeOrigin(raw: string): string | null {
  try {
    const url = new URL(raw);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    if (url.pathname !== "/" || url.search || url.hash) return null;
    return url.origin;
  } catch {
    return null;
  }
}

/** Lê `CORS_ALLOWED_ORIGINS` (URLs absolutas separadas por vírgula). */
export function parseAllowedOrigins(value: string | undefined): ParsedOrigins {
  const origins: string[] = [];
  const invalid: string[] = [];
  for (const part of (value ?? "").split(",")) {
    const raw = part.trim();
    if (!raw) continue;
    const origin = normalizeOrigin(raw);
    if (origin) origins.push(origin);
    else invalid.push(raw);
  }
  return { origins: [...new Set(origins)], invalid };
}

const METHODS = "GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS";

/**
 * Sem lista, mantém o comportamento anterior (reflete a origem) — usado só
 * em desenvolvimento e sinalizado no boot em ambiente implantado. Com lista,
 * só as origens declaradas recebem `Access-Control-Allow-Origin`.
 */
export function createCorsOptions(
  allowedOrigins: readonly string[],
): CorsOptions {
  if (allowedOrigins.length === 0) {
    return { origin: true, methods: METHODS, credentials: true };
  }
  const allowed = new Set(allowedOrigins);
  return {
    origin: (origin, callback) => {
      // Requisições sem `Origin` (curl, health check, servidor a servidor) não são CORS.
      if (!origin || allowed.has(origin)) callback(null, true);
      else callback(null, false);
    },
    methods: METHODS,
    credentials: true,
  };
}
