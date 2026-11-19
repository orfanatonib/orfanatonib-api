import { Injectable, Optional } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import { AI_PROVIDER_CONFIG_KEYS } from "../ai-management/constants";
import {
  parseEnabledConfig,
  parseModelAllowlist,
} from "../ai-management/utils/ai-provider-config.util";
import { AiGenerationGateway } from "./ai-generation.gateway";
import { AiGenerationCapability } from "./enums/ai-generation-capability.enum";
import { classifyProviderHttpError } from "./utils/provider-http-error.util";
import { AiProviderErrorKind } from "./enums/ai-provider-error-kind.enum";
import { AiProviderHealth } from "./enums/ai-provider-health.enum";
import { AiProvider } from "./enums/ai-provider.enum";
import { StudioProviderOverrides } from "./provider-overrides.service";
import { AiProviderRequestError } from "./openai-generation.gateway";
import {
  AiModelDescriptor,
  AiProviderHealthResult,
  ImageGenerationRequest,
  ImageGenerationResult,
  StructuredTextGenerationRequest,
  StructuredTextGenerationResult,
} from "./types";
import { validateStructuredContent } from "./utils/structured-content-policy.util";
import { containsSensitiveContentInstruction } from "./utils/ai-provider-policy.util";

interface GeminiErrorBody {
  error?: { code?: number; status?: string; message?: string };
}

interface GeminiResponseBody {
  candidates?: Array<{
    finishReason?: string;
    content?: { parts?: Array<{ text?: string }> };
  }>;
  promptFeedback?: { blockReason?: string };
  usageMetadata?: {
    promptTokenCount?: number;
    candidatesTokenCount?: number;
    totalTokenCount?: number;
  };
}

const BASE_URL = "https://generativelanguage.googleapis.com/v1beta";

/** Adaptador do Gemini (texto estruturado). Imagem ainda não é suportada por este provedor. */
@Injectable()
export class GeminiGenerationGateway extends AiGenerationGateway {
  private readonly providerConfig = AI_PROVIDER_CONFIG_KEYS[AiProvider.GEMINI];

  constructor(
    private readonly config: ConfigService,
    @Optional() private readonly overrides?: StudioProviderOverrides,
  ) {
    super();
  }

  async generateStructuredText(
    request: StructuredTextGenerationRequest,
  ): Promise<StructuredTextGenerationResult> {
    this.assertSafeRequest(request.instructions, request.input);
    const { model, apiKey } = await this.runtime(
      AiGenerationCapability.TEXT_STRUCTURED,
    );
    const startedAt = Date.now();
    const payload = await this.request<GeminiResponseBody>(
      `/models/${encodeURIComponent(model)}:generateContent`,
      {
        method: "POST",
        body: JSON.stringify({
          systemInstruction: {
            parts: [
              {
                text: [
                  "Crie material pastoral seguro, sem dados pessoais ou identificação de pessoas reais.",
                  ...request.instructions,
                ].join("\n\n"),
              },
            ],
          },
          contents: [
            { role: "user", parts: [{ text: JSON.stringify(request.input) }] },
          ],
          generationConfig: {
            responseMimeType: "application/json",
            responseSchema: request.outputSchema,
            maxOutputTokens: 4_000,
          },
        }),
      },
      apiKey,
    );

    if (payload.promptFeedback?.blockReason)
      throw new AiProviderRequestError(AiProviderErrorKind.SAFETY);
    const candidate = payload.candidates?.[0];
    if (candidate?.finishReason === "SAFETY")
      throw new AiProviderRequestError(AiProviderErrorKind.SAFETY);
    const text = (candidate?.content?.parts ?? [])
      .map((part) => part.text ?? "")
      .join("");
    if (!text) throw new AiProviderRequestError(AiProviderErrorKind.SCHEMA);

    let output: Record<string, unknown>;
    try {
      const parsed: unknown = JSON.parse(text);
      if (!parsed || Array.isArray(parsed) || typeof parsed !== "object")
        throw new Error("Invalid structured result");
      output = parsed as Record<string, unknown>;
    } catch {
      throw new AiProviderRequestError(AiProviderErrorKind.SCHEMA);
    }
    try {
      validateStructuredContent(output);
    } catch {
      throw new AiProviderRequestError(AiProviderErrorKind.SAFETY);
    }

    const usage = payload.usageMetadata;
    return {
      provider: AiProvider.GEMINI,
      model,
      output,
      usage: usage
        ? {
            inputTokens: usage.promptTokenCount ?? null,
            outputTokens: usage.candidatesTokenCount ?? null,
            totalTokens: usage.totalTokenCount ?? null,
          }
        : null,
      durationMs: Date.now() - startedAt,
    };
  }

  generateImage(
    request: ImageGenerationRequest,
  ): Promise<ImageGenerationResult> {
    void request;
    return Promise.reject(
      new AiProviderRequestError(AiProviderErrorKind.SCHEMA),
    );
  }

  listModels(
    capability: AiGenerationCapability,
  ): Promise<readonly AiModelDescriptor[]> {
    return Promise.resolve(
      parseModelAllowlist(
        this.config.get<string>(this.providerConfig.textModels),
        this.config.get<string>(this.providerConfig.imageModels),
      )
        .filter((model) => model.capabilities.includes(capability))
        .map((model) => ({
          id: model.id,
          displayName: model.id,
          capabilities: model.capabilities,
          verifiedAt: null,
        })),
    );
  }

  healthCheck(): Promise<AiProviderHealthResult> {
    const configured =
      parseEnabledConfig(
        this.config.get<string>(this.providerConfig.enabled),
      ) &&
      Boolean(
        this.config.get<string>(this.providerConfig.credential)?.trim(),
      ) &&
      parseModelAllowlist(
        this.config.get<string>(this.providerConfig.textModels),
        this.config.get<string>(this.providerConfig.imageModels),
      ).length > 0;
    return Promise.resolve({
      status: configured
        ? AiProviderHealth.UNKNOWN
        : AiProviderHealth.UNAVAILABLE,
      checkedAt: new Date().toISOString(),
      durationMs: 0,
      code: configured ? "CONFIGURED_NOT_PROBED" : "PROVIDER_NOT_CONFIGURED",
    });
  }

  /**
   * Chave e modelo desta chamada: o que o painel salvou (se houver chave) ou, senão, o ambiente.
   * Com o painel, o modelo é o padrão salvo para a capacidade; sem ele, o primeiro da lista permitida.
   */
  private async runtime(
    capability: AiGenerationCapability,
  ): Promise<{ model: string; apiKey: string }> {
    const saved = await this.overrides?.forProvider(AiProvider.GEMINI);
    if (saved) {
      const model =
        capability === AiGenerationCapability.IMAGE_GENERATION
          ? saved.imageModel
          : saved.textModel;
      if (!model)
        throw new AiProviderRequestError(AiProviderErrorKind.NOT_FOUND_MODEL);
      return { model, apiKey: saved.apiKey };
    }
    return { model: this.envModel(capability), apiKey: this.envApiKey() };
  }

  private envApiKey(): string {
    const apiKey = this.config
      .get<string>(this.providerConfig.credential)
      ?.trim();
    if (!apiKey)
      throw new AiProviderRequestError(AiProviderErrorKind.AUTHENTICATION);
    return apiKey;
  }

  private envModel(capability: AiGenerationCapability): string {
    if (
      !parseEnabledConfig(this.config.get<string>(this.providerConfig.enabled))
    )
      throw new AiProviderRequestError(AiProviderErrorKind.AUTHENTICATION);
    const configured = parseModelAllowlist(
      this.config.get<string>(this.providerConfig.textModels),
      this.config.get<string>(this.providerConfig.imageModels),
    ).find((model) => model.capabilities.includes(capability));
    if (
      !configured ||
      !this.config.get<string>(this.providerConfig.credential)?.trim()
    )
      throw new AiProviderRequestError(AiProviderErrorKind.AUTHENTICATION);
    return configured.id;
  }

  private assertSafeRequest(
    instructions: readonly string[],
    input: Record<string, unknown>,
  ): void {
    try {
      validateStructuredContent(input);
    } catch {
      throw new AiProviderRequestError(AiProviderErrorKind.SAFETY);
    }
    const serialized = `${instructions.join("\n")}\n${JSON.stringify(input)}`;
    if (containsSensitiveContentInstruction(serialized))
      throw new AiProviderRequestError(AiProviderErrorKind.SAFETY);
    if (Buffer.byteLength(serialized, "utf8") > 100 * 1024)
      throw new AiProviderRequestError(AiProviderErrorKind.SCHEMA);
  }

  private async request<T>(
    path: string,
    init: RequestInit,
    apiKey: string,
  ): Promise<T> {
    const abortController = new AbortController();
    const configured = Number(
      this.config.get<string>("CONTENT_STUDIO_PROVIDER_TIMEOUT_MS") ?? 60_000,
    );
    const timeoutMs =
      Number.isFinite(configured) && configured > 0
        ? Math.min(configured, 120_000)
        : 60_000;
    const timeout = setTimeout(
      () => abortController.abort(),
      Math.max(1_000, timeoutMs),
    );
    try {
      const response = await fetch(`${BASE_URL}${path}`, {
        ...init,
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey,
        },
        signal: abortController.signal,
      });
      if (!response.ok) {
        const body = (await response
          .json()
          .catch(() => ({}))) as GeminiErrorBody;
        throw new AiProviderRequestError(
          classifyProviderHttpError({
            status: response.status,
            code: body.error?.status,
            message: body.error?.message,
          }),
        );
      }
      return (await response.json()) as T;
    } catch (error) {
      if (error instanceof AiProviderRequestError) throw error;
      if (abortController.signal.aborted)
        throw new AiProviderRequestError(AiProviderErrorKind.TIMEOUT);
      throw new AiProviderRequestError(AiProviderErrorKind.NETWORK);
    } finally {
      clearTimeout(timeout);
    }
  }
}
