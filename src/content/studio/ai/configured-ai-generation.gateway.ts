import { AiGenerationGateway } from "./ai-generation.gateway";
import { AiGenerationCapability } from "./enums/ai-generation-capability.enum";
import { AiProvider } from "./enums/ai-provider.enum";
import { StudioProviderOverrides } from "./provider-overrides.service";
import {
  AiModelDescriptor,
  AiProviderHealthResult,
  ImageGenerationRequest,
  ImageGenerationResult,
  StructuredTextGenerationRequest,
  StructuredTextGenerationResult,
} from "./types";

/**
 * Escolhe o provedor a CADA chamada, para o painel "Provedores e Modelos IA" valer na próxima geração
 * sem reiniciar o servidor:
 *   1. modo simulado (`AI_PROVIDER_MODE=fake`, só fora de produção): sempre o simulado;
 *   2. provedor ativo no painel, se tiver chave salva e legível;
 *   3. senão, `CONTENT_STUDIO_AI_PROVIDER` do ambiente (`gemini`; qualquer outro valor = OpenAI).
 */
export class ConfiguredAiGenerationGateway extends AiGenerationGateway {
  constructor(
    private readonly envProvider: string | undefined,
    private readonly overrides: Pick<StudioProviderOverrides, "activeProvider">,
    private readonly openai: AiGenerationGateway,
    private readonly gemini: AiGenerationGateway,
    private readonly fake?: AiGenerationGateway,
  ) {
    super();
  }

  private async pick(): Promise<AiGenerationGateway> {
    if (this.fake) return this.fake;
    const active = await this.overrides.activeProvider();
    if (active) return active === AiProvider.GEMINI ? this.gemini : this.openai;
    return this.envProvider?.toLowerCase() === "gemini"
      ? this.gemini
      : this.openai;
  }

  async generateStructuredText(
    request: StructuredTextGenerationRequest,
  ): Promise<StructuredTextGenerationResult> {
    return (await this.pick()).generateStructuredText(request);
  }

  async generateImage(
    request: ImageGenerationRequest,
  ): Promise<ImageGenerationResult> {
    return (await this.pick()).generateImage(request);
  }

  async listModels(
    capability: AiGenerationCapability,
  ): Promise<readonly AiModelDescriptor[]> {
    return (await this.pick()).listModels(capability);
  }

  async healthCheck(): Promise<AiProviderHealthResult> {
    return (await this.pick()).healthCheck();
  }
}
