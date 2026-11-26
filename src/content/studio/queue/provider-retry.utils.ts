/** Política de retry para chamadas a provedores de IA (backoff exponencial + jitter + Retry-After). */

export interface RetryPolicy {
  /** Número máximo de tentativas (inclui a primeira). */
  maxAttempts: number;
  baseDelayMs: number;
  /** Teto de qualquer espera: se o provedor pedir mais que isso, NÃO dormimos. */
  maxDelayMs: number;
  /** Fração de jitter (0–1) aplicada sobre o atraso exponencial. */
  jitterRatio: number;
}

export const DEFAULT_RETRY_POLICY: Readonly<RetryPolicy> = {
  maxAttempts: 3,
  baseDelayMs: 1_000,
  maxDelayMs: 30_000,
  jitterRatio: 0.25,
};

/** `Retry-After` em segundos ("120") ou data HTTP; devolve milissegundos ou null. */
export function parseRetryAfterMs(
  header: string | number | null | undefined,
  now: number = Date.now(),
): number | null {
  if (header === null || header === undefined || header === "") return null;
  if (typeof header === "number") {
    return Number.isFinite(header) && header >= 0
      ? Math.round(header * 1000)
      : null;
  }
  const trimmed = header.trim();
  if (/^\d+(\.\d+)?$/.test(trimmed)) return Math.round(Number(trimmed) * 1000);
  const date = Date.parse(trimmed);
  if (Number.isNaN(date)) return null;
  return Math.max(0, date - now);
}

/** Atraso da tentativa `attempt` (1 = depois da 1ª falha): exponencial com jitter, limitado ao teto. */
export function backoffDelayMs(
  attempt: number,
  policy: RetryPolicy = DEFAULT_RETRY_POLICY,
  random: () => number = Math.random,
): number {
  const exponential = policy.baseDelayMs * 2 ** Math.max(0, attempt - 1);
  const jitter = exponential * policy.jitterRatio * (random() * 2 - 1);
  return Math.min(
    policy.maxDelayMs,
    Math.max(0, Math.round(exponential + jitter)),
  );
}

export type RetryDecision =
  | { retry: true; delayMs: number }
  | { retry: false; reason: "exhausted" | "hint-over-cap" };

/**
 * Decide se tenta de novo e quanto espera. O `Retry-After` do provedor manda no
 * atraso (nunca menos que o backoff); se passa do teto, desiste em vez de dormir.
 */
export function decideRetry(
  attempt: number,
  retryAfterMs: number | null,
  policy: RetryPolicy = DEFAULT_RETRY_POLICY,
  random: () => number = Math.random,
): RetryDecision {
  if (attempt >= policy.maxAttempts)
    return { retry: false, reason: "exhausted" };
  if (retryAfterMs !== null && retryAfterMs > policy.maxDelayMs) {
    return { retry: false, reason: "hint-over-cap" };
  }
  const backoff = backoffDelayMs(attempt, policy, random);
  return { retry: true, delayMs: Math.max(backoff, retryAfterMs ?? 0) };
}
