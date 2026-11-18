import { AiGenerationCapability } from "./enums/ai-generation-capability.enum";
import { AiProviderHealth } from "./enums/ai-provider-health.enum";

export interface StructuredTextGenerationRequest {
  readonly correlationId: string;
  readonly instructions: readonly string[];
  readonly input: Record<string, unknown>;
  readonly outputSchema: Record<string, unknown>;
}

export interface StructuredTextGenerationResult {
  readonly provider: string;
  readonly model: string;
  readonly output: Record<string, unknown>;
  readonly usage: AiTokenUsage | null;
  readonly durationMs: number;
}

export interface ImageGenerationRequest {
  readonly correlationId: string;
  readonly instructions: readonly string[];
  readonly input: Record<string, unknown>;
}

export interface ImageGenerationResult {
  readonly provider: string;
  readonly model: string;
  readonly mediaType: string;
  readonly bytes: Uint8Array;
  readonly durationMs: number;
}

export interface AiTokenUsage {
  readonly inputTokens: number | null;
  readonly outputTokens: number | null;
  readonly totalTokens: number | null;
}

export interface AiModelDescriptor {
  readonly id: string;
  readonly displayName: string;
  readonly capabilities: readonly AiGenerationCapability[];
  readonly verifiedAt: string | null;
}

export interface AiProviderHealthResult {
  readonly status: AiProviderHealth;
  readonly checkedAt: string;
  readonly durationMs: number;
  readonly code: string | null;
}
