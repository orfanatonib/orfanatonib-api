import { AiGenerationCapability } from "../../ai/enums/ai-generation-capability.enum";
import { AiProviderHealth } from "../../ai/enums/ai-provider-health.enum";
import { AiProvider } from "../../ai/enums/ai-provider.enum";

export class AiConfiguredModelResponseDto {
  id: string;
  capabilities: AiGenerationCapability[];
}

export class AiProviderResponseDto {
  provider: AiProvider;
  enabled: boolean;
  credentialConfigured: boolean;
  health: AiProviderHealth;
  models: AiConfiguredModelResponseDto[];
  configurationSource: string;
}

