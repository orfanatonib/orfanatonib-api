import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import { AiProviderHealth } from "../../ai/enums/ai-provider-health.enum";
import {
  AI_PROVIDER_CONFIG_KEYS,
  AI_PROVIDERS,
} from "../constants";
import { AiProviderResponseDto } from "../dto/ai-provider-response.dto";
import {
  parseEnabledConfig,
  parseModelAllowlist,
} from "../utils/ai-provider-config.util";

@Injectable()
export class GetAiProvidersService {
  constructor(private readonly config: ConfigService) {}

  execute(): AiProviderResponseDto[] {
    return AI_PROVIDERS.map((provider) => {
      const keys = AI_PROVIDER_CONFIG_KEYS[provider];
      const credential = this.config.get<string>(keys.credential);
      return {
        provider,
        enabled: parseEnabledConfig(this.config.get<string>(keys.enabled)),
        credentialConfigured: Boolean(credential?.trim()),
        health: AiProviderHealth.UNKNOWN,
        models: parseModelAllowlist(
          this.config.get<string>(keys.textModels),
          this.config.get<string>(keys.imageModels),
        ).map((model) => ({
          id: model.id,
          capabilities: [...model.capabilities],
        })),
        configurationSource: "DEPLOYMENT",
      };
    });
  }
}
