import { Injectable } from "@nestjs/common";

import {
  estimateTokens,
  FakeAiFailure,
  FakeFailureCounter,
  FakeTokenQuota,
  isFakeModeAllowed,
  parseFakeDirective,
} from "../ai-fake/fake-ai-limits.util";
import { sampleFromSchema } from "../ai-fake/schema-sample.util";
import { AiGenerationGateway } from "./ai-generation.gateway";
import { AiProviderRequestError } from "./openai-generation.gateway";
import { AiGenerationCapability } from "./enums/ai-generation-capability.enum";
import { AiProviderErrorKind } from "./enums/ai-provider-error-kind.enum";
import { AiProviderHealth } from "./enums/ai-provider-health.enum";
import {
  AiModelDescriptor,
  AiProviderHealthResult,
  ImageGenerationRequest,
  ImageGenerationResult,
  StructuredTextGenerationRequest,
  StructuredTextGenerationResult,
} from "./types";

const FAKE_PROVIDER = "FAKE";
const FAKE_MODEL = "fake-model-1";
const PNG_1X1 = Uint8Array.from(
  Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
    "base64",
  ),
);

const KIND_BY_FAILURE: Readonly<Record<FakeAiFailure, AiProviderErrorKind>> = {
  [FakeAiFailure.RATE_LIMIT]: AiProviderErrorKind.RATE_LIMIT,
  [FakeAiFailure.QUOTA]: AiProviderErrorKind.QUOTA,
  [FakeAiFailure.TIMEOUT]: AiProviderErrorKind.TIMEOUT,
  [FakeAiFailure.MODERATION]: AiProviderErrorKind.SAFETY,
  [FakeAiFailure.SERVER_ERROR]: AiProviderErrorKind.SERVER,
  [FakeAiFailure.INVALID_SCHEMA]: AiProviderErrorKind.SCHEMA,
  [FakeAiFailure.NETWORK]: AiProviderErrorKind.UNKNOWN,
};

/**
 * Provedor simulado dos E2E: nunca chama LLM real. Falhas e cotas são pedidas
 * por diretivas `[[fake:429]]`, `[[fake:quota]]`… no texto do pedido.
 * Só existe quando `AI_PROVIDER_MODE=fake` fora de produção.
 */
@Injectable()
export class FakeAiGenerationGateway extends AiGenerationGateway {
  private readonly failures = new FakeFailureCounter();
  private readonly quota: FakeTokenQuota;

  constructor(
    mode: string | undefined,
    environment: string | undefined,
    quotaTokens = 20_000,
  ) {
    super();
    if (!isFakeModeAllowed(mode, environment)) {
      throw new Error(
        "FakeAiGenerationGateway só pode ser usado com AI_PROVIDER_MODE=fake fora de produção",
      );
    }
    this.quota = new FakeTokenQuota(quotaTokens);
  }

  get remainingQuota(): number {
    return this.quota.left;
  }

  private simulate(
    correlationId: string,
    payload: unknown,
    tokens: number,
  ): void {
    const directive = parseFakeDirective(JSON.stringify(payload));
    if (directive && this.failures.shouldFail(correlationId, directive)) {
      throw new AiProviderRequestError(
        KIND_BY_FAILURE[directive.descriptor.failure],
      );
    }
    if (!this.quota.consume(tokens))
      throw new AiProviderRequestError(AiProviderErrorKind.QUOTA);
  }

  generateStructuredText(
    request: StructuredTextGenerationRequest,
  ): Promise<StructuredTextGenerationResult> {
    const inputTokens = estimateTokens(
      JSON.stringify([request.instructions, request.input]),
    );
    try {
      this.simulate(
        request.correlationId,
        [request.instructions, request.input],
        inputTokens,
      );
    } catch (error) {
      return Promise.reject(
        error instanceof Error ? error : new Error(String(error)),
      );
    }
    const output = sampleFromSchema(request.outputSchema);
    const outputTokens = estimateTokens(JSON.stringify(output));
    return Promise.resolve({
      provider: FAKE_PROVIDER,
      model: FAKE_MODEL,
      output: (output ?? {}) as Record<string, unknown>,
      usage: {
        inputTokens,
        outputTokens,
        totalTokens: inputTokens + outputTokens,
      },
      durationMs: 1,
    });
  }

  generateImage(
    request: ImageGenerationRequest,
  ): Promise<ImageGenerationResult> {
    try {
      this.simulate(
        request.correlationId,
        [request.instructions, request.input],
        100,
      );
    } catch (error) {
      return Promise.reject(
        error instanceof Error ? error : new Error(String(error)),
      );
    }
    return Promise.resolve({
      provider: FAKE_PROVIDER,
      model: FAKE_MODEL,
      mediaType: "image/png",
      bytes: PNG_1X1,
      durationMs: 1,
    });
  }

  listModels(
    capability: AiGenerationCapability,
  ): Promise<readonly AiModelDescriptor[]> {
    return Promise.resolve([
      {
        id: FAKE_MODEL,
        displayName: "Modelo simulado",
        capabilities: [capability],
        verifiedAt: null,
      },
    ]);
  }

  healthCheck(): Promise<AiProviderHealthResult> {
    return Promise.resolve({
      status: AiProviderHealth.HEALTHY,
      checkedAt: new Date().toISOString(),
      durationMs: 0,
      code: null,
    });
  }
}
