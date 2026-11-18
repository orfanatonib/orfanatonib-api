import {
  CONTENT_STUDIO_SENSITIVE_INSTRUCTION_PATTERNS,
  REDACTED_AI_ERROR_MESSAGE,
  RETRYABLE_AI_PROVIDER_ERRORS,
} from "../constants";
import { AiProviderErrorKind } from "../enums/ai-provider-error-kind.enum";

export function isRetryableAiProviderError(kind: AiProviderErrorKind): boolean {
  return RETRYABLE_AI_PROVIDER_ERRORS.includes(kind);
}

export function containsSensitiveContentInstruction(value: string): boolean {
  return CONTENT_STUDIO_SENSITIVE_INSTRUCTION_PATTERNS.some((pattern) =>
    pattern.test(value),
  );
}

export function redactAiProviderError(): string {
  return REDACTED_AI_ERROR_MESSAGE;
}

export function calculateRetryDelayMs(
  baseDelayMs: number,
  attempt: number,
  jitterRatio: number,
  randomValue: number,
): number {
  const exponentialDelay = baseDelayMs * 2 ** Math.max(0, attempt - 1);
  const boundedRandom = Math.min(1, Math.max(0, randomValue));
  const jitter = exponentialDelay * jitterRatio * boundedRandom;
  return Math.round(exponentialDelay + jitter);
}
