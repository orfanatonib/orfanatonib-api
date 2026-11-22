import { Injectable, Optional } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import { REDACTED_AI_ERROR_MESSAGE } from "./constants";
import { AiGenerationGateway } from "./ai-generation.gateway";
import { AiGenerationCapability } from "./enums/ai-generation-capability.enum";
import { classifyProviderHttpError } from "./utils/provider-http-error.util";
import { AiProviderErrorKind } from "./enums/ai-provider-error-kind.enum";
import { AiProviderHealth } from "./enums/ai-provider-health.enum";
import {
  AiModelDescriptor,
  AiProviderHealthResult,
  ImageGenerationRequest,
  ImageGenerationResult,
  ImageReference,
  StructuredTextGenerationRequest,
  StructuredTextGenerationResult,
} from "./types";
import { AI_PROVIDER_CONFIG_KEYS } from "../ai-management/constants";
import {
  parseEnabledConfig,
  parseModelAllowlist,
} from "../ai-management/utils/ai-provider-config.util";
import { AiProvider } from "./enums/ai-provider.enum";
import { StudioProviderOverrides } from "./provider-overrides.service";
import { validateStructuredContent } from "./utils/structured-content-policy.util";
import {
  resolveImageQuality,
  resolveImageSize,
  resolveMaxOutputTokens,
} from "./utils/generation-options.util";
import { containsSensitiveContentInstruction } from "./utils/ai-provider-policy.util";

interface OpenAiErrorBody {
  error?: {
    code?: string | null;
    type?: string | null;
    message?: string | null;
  };
}

interface OpenAiResponseBody {
  status?: string;
  incomplete_details?: { reason?: string } | null;
  output?: Array<{
    type?: string;
    content?: Array<{ type?: string; text?: string }>;
  }>;
  usage?: {
    input_tokens?: number;
    output_tokens?: number;
    total_tokens?: number;
  };
}

interface OpenAiImageBody {
  data?: Array<{ b64_json?: string }>;
}

/** Uma lição longa com raciocínio leva de 30 s a mais de 2 min: o limite antigo (60 s) cortava a geração de adultos. */
const DEFAULT_PROVIDER_TIMEOUT_MS = 180_000;
const MAX_PROVIDER_TIMEOUT_MS = 300_000;

export class AiProviderRequestError extends Error {
  /**
   * `detail` é um código curto e seguro da causa (ex.: `incomplete:max_output_tokens`), para log e auditoria;
   * nunca carrega prompt, conteúdo gerado nem a mensagem crua do provedor.
   */
  constructor(
    readonly kind: AiProviderErrorKind,
    readonly detail?: string,
  ) {
    super(REDACTED_AI_ERROR_MESSAGE);
    this.name = "AiProviderRequestError";
  }
}

/** Corpo multipart da edição de imagem: os mesmos campos da geração, mais as imagens de referência. */
function imageEditForm(
  fields: { model: string; prompt: string; size: string; quality: string },
  references: readonly ImageReference[],
): FormData {
  const form = new FormData();
  form.append("model", fields.model);
  form.append("prompt", fields.prompt);
  form.append("size", fields.size);
  form.append("quality", fields.quality);
  form.append("output_format", "png");
  form.append("n", "1");
  references.forEach((reference, index) => {
    form.append(
      "image[]",
      new Blob([Buffer.from(reference.bytes)], { type: reference.mediaType }),
      `referencia-${index + 1}.png`,
    );
  });
  return form;
}

@Injectable()
export class OpenAiGenerationGateway extends AiGenerationGateway {
  private readonly providerConfig = AI_PROVIDER_CONFIG_KEYS[AiProvider.OPENAI];

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
    const payload = await this.request<OpenAiResponseBody>(
      "/responses",
      {
        method: "POST",
        body: JSON.stringify({
          model,
          max_output_tokens: resolveMaxOutputTokens(request.maxOutputTokens),
          instructions: [
            "Crie material pastoral seguro, sem dados pessoais ou identificação de pessoas reais.",
            ...request.instructions,
          ].join("\n\n"),
          input: JSON.stringify(request.input),
          store: false,
          text: {
            format: {
              type: "json_schema",
              name: "content_stage",
              strict: true,
              schema: request.outputSchema,
            },
          },
        }),
      },
      apiKey,
    );
    const contentItems =
      payload.output?.flatMap((item) => item.content ?? []) ?? [];
    if (contentItems.some((item) => item.type === "refusal"))
      throw new AiProviderRequestError(AiProviderErrorKind.SAFETY, "refusal");
    if (payload.status === "incomplete")
      throw new AiProviderRequestError(
        AiProviderErrorKind.OUTPUT_TRUNCATED,
        `incomplete:${payload.incomplete_details?.reason ?? "unknown"}`,
      );
    const outputText = contentItems
      .filter((item) => item.type === "output_text")
      .map((item) => item.text ?? "")
      .join("");
    if (!outputText)
      throw new AiProviderRequestError(
        AiProviderErrorKind.SCHEMA,
        "empty_output",
      );

    let output: Record<string, unknown>;
    try {
      const parsed: unknown = JSON.parse(outputText);
      if (!parsed || Array.isArray(parsed) || typeof parsed !== "object") {
        throw new Error("Invalid structured result");
      }
      output = parsed as Record<string, unknown>;
    } catch {
      throw new AiProviderRequestError(
        AiProviderErrorKind.SCHEMA,
        "invalid_json",
      );
    }
    try {
      validateStructuredContent(output);
    } catch {
      throw new AiProviderRequestError(
        AiProviderErrorKind.SAFETY,
        "unsafe_output",
      );
    }

    return {
      provider: AiProvider.OPENAI,
      model,
      output,
      usage: payload.usage
        ? {
            inputTokens: payload.usage.input_tokens ?? null,
            outputTokens: payload.usage.output_tokens ?? null,
            totalTokens: payload.usage.total_tokens ?? null,
          }
        : null,
      durationMs: Date.now() - startedAt,
    };
  }

  async generateImage(
    request: ImageGenerationRequest,
  ): Promise<ImageGenerationResult> {
    this.assertSafeRequest(request.instructions, request.input);
    const { model, apiKey } = await this.runtime(
      AiGenerationCapability.IMAGE_GENERATION,
    );
    const startedAt = Date.now();
    const prompt = [
      "Crie uma ilustração para material bíblico impresso. Personagens bíblicos são desenhados de forma estilizada (podem ter rosto); nunca retrate pessoas reais ou identificáveis. Não escreva texto na imagem, a menos que o pedido peça expressamente.",
      ...request.instructions,
      JSON.stringify(request.input),
    ].join("\n\n");
    const size = resolveImageSize(request.size);
    const quality = resolveImageQuality(request.quality);
    const references = request.referenceImages ?? [];
    // Com imagem de referência o pedido vai para a edição (multipart): o gerador parte do desenho recebido.
    const payload = references.length
      ? await this.request<OpenAiImageBody>(
          "/images/edits",
          {
            method: "POST",
            body: imageEditForm({ model, prompt, size, quality }, references),
          },
          apiKey,
        )
      : await this.request<OpenAiImageBody>(
          "/images/generations",
          {
            method: "POST",
            body: JSON.stringify({
              model,
              prompt,
              size,
              quality,
              output_format: "png",
              n: 1,
            }),
          },
          apiKey,
        );
    const encoded = payload.data?.[0]?.b64_json;
    if (!encoded) throw new AiProviderRequestError(AiProviderErrorKind.SCHEMA);
    const bytes = new Uint8Array(Buffer.from(encoded, "base64"));
    if (bytes.byteLength > 10 * 1024 * 1024)
      throw new AiProviderRequestError(AiProviderErrorKind.SCHEMA);

    return {
      provider: AiProvider.OPENAI,
      model,
      mediaType: "image/png",
      bytes,
      durationMs: Date.now() - startedAt,
    };
  }

  async listModels(
    capability: AiGenerationCapability,
  ): Promise<readonly AiModelDescriptor[]> {
    return parseModelAllowlist(
      this.config.get<string>(this.providerConfig.textModels),
      this.config.get<string>(this.providerConfig.imageModels),
    )
      .filter((model) => model.capabilities.includes(capability))
      .map((model) => ({
        id: model.id,
        displayName: model.id,
        capabilities: model.capabilities,
        verifiedAt: null,
      }));
  }

  async healthCheck(): Promise<AiProviderHealthResult> {
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
    return {
      status: configured
        ? AiProviderHealth.UNKNOWN
        : AiProviderHealth.UNAVAILABLE,
      checkedAt: new Date().toISOString(),
      durationMs: 0,
      code: configured ? "CONFIGURED_NOT_PROBED" : "PROVIDER_NOT_CONFIGURED",
    };
  }

  /**
   * Chave e modelo desta chamada: o que o painel salvou (se houver chave) ou, senão, o ambiente.
   * Com o painel, o modelo é o padrão salvo para a capacidade; sem ele, o primeiro da lista permitida.
   */
  private async runtime(
    capability: AiGenerationCapability,
  ): Promise<{ model: string; apiKey: string }> {
    const saved = await this.overrides?.forProvider(AiProvider.OPENAI);
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
    ) {
      throw new AiProviderRequestError(AiProviderErrorKind.AUTHENTICATION);
    }
    const configured = parseModelAllowlist(
      this.config.get<string>(this.providerConfig.textModels),
      this.config.get<string>(this.providerConfig.imageModels),
    ).find((model) => model.capabilities.includes(capability));
    if (!configured)
      throw new AiProviderRequestError(AiProviderErrorKind.AUTHENTICATION);
    if (!this.config.get<string>(this.providerConfig.credential)?.trim()) {
      throw new AiProviderRequestError(AiProviderErrorKind.AUTHENTICATION);
    }
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
    if (containsSensitiveContentInstruction(serialized)) {
      throw new AiProviderRequestError(AiProviderErrorKind.SAFETY);
    }
    if (Buffer.byteLength(serialized, "utf8") > 100 * 1024) {
      throw new AiProviderRequestError(AiProviderErrorKind.SCHEMA);
    }
  }

  private async request<T>(
    path: string,
    init: RequestInit,
    apiKey: string,
  ): Promise<T> {
    const abortController = new AbortController();
    const configuredTimeout = Number(
      this.config.get<string>("CONTENT_STUDIO_PROVIDER_TIMEOUT_MS") ??
        DEFAULT_PROVIDER_TIMEOUT_MS,
    );
    const timeoutMs =
      Number.isFinite(configuredTimeout) && configuredTimeout > 0
        ? Math.min(configuredTimeout, MAX_PROVIDER_TIMEOUT_MS)
        : DEFAULT_PROVIDER_TIMEOUT_MS;
    const timeout = setTimeout(
      () => abortController.abort(),
      Math.max(1_000, timeoutMs),
    );
    try {
      const response = await fetch(`https://api.openai.com/v1${path}`, {
        ...init,
        // Multipart: o fetch define o Content-Type com o boundary.
        headers: {
          ...(init.body instanceof FormData
            ? {}
            : { "Content-Type": "application/json" }),
          Authorization: `Bearer ${apiKey}`,
        },
        signal: abortController.signal,
      });
      if (!response.ok) {
        const errorBody = (await response
          .json()
          .catch(() => ({}))) as OpenAiErrorBody;
        throw new AiProviderRequestError(
          classifyProviderHttpError({
            status: response.status,
            code: errorBody.error?.code ?? undefined,
            message: errorBody.error?.message ?? undefined,
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
