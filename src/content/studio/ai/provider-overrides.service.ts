import { Injectable } from "@nestjs/common";

import { GetAiProviderSettingsService } from "src/content/ai-lessons/services/get-ai-provider-settings.service";
import { AiProvider } from "./enums/ai-provider.enum";

export interface SavedProviderRuntime {
  apiKey: string;
  textModel: string;
  imageModel: string;
}

/**
 * O que o painel "Provedores e Modelos IA" salvou, para o Estúdio usar na próxima geração.
 *
 * Só vale quando há uma chave salva e legível para o provedor; sem ela, o Estúdio segue
 * com a configuração do ambiente (`CONTENT_STUDIO_*`), como antes do painel existir.
 */
@Injectable()
export class StudioProviderOverrides {
  constructor(private readonly settings: GetAiProviderSettingsService) {}

  async forProvider(
    provider: AiProvider,
  ): Promise<SavedProviderRuntime | null> {
    try {
      if (provider === AiProvider.OPENAI) {
        const saved = await this.settings.getInternalOpenAiSettings();
        return saved.apiKey && !saved.apiKeyUnreadable
          ? {
              apiKey: saved.apiKey,
              textModel: saved.generalModel,
              imageModel: saved.imageModel,
            }
          : null;
      }
      const saved = await this.settings.getInternalGeminiSettings();
      return saved.apiKey && !saved.apiKeyUnreadable
        ? {
            apiKey: saved.apiKey,
            textModel: saved.generalModel,
            imageModel: saved.imageModel,
          }
        : null;
    } catch {
      // Banco indisponível: cai para o ambiente em vez de derrubar a geração.
      return null;
    }
  }

  /** Provedor ativo no painel, ou `null` se o ativo não tem chave salva (vale o do ambiente). */
  async activeProvider(): Promise<AiProvider | null> {
    try {
      const active = await this.settings.getActiveProvider();
      const provider =
        String(active).toLowerCase() === "gemini"
          ? AiProvider.GEMINI
          : AiProvider.OPENAI;
      return (await this.forProvider(provider)) ? provider : null;
    } catch {
      return null;
    }
  }
}
