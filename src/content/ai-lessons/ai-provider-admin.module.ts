import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";

import { AiRequestQueueModule } from "src/shared/providers/ai-queue/ai-request-queue.module";
import { AiProviderSettingsModule } from "./ai-provider-settings.module";
import { AiProvidersController } from "./controllers/ai-providers.controller";
import { AiProvidersConfigService } from "./services/ai-providers-config.service";

/**
 * Painel de gerenciamento dos provedores de IA (ChatGPT/OpenAI e Gemini), igual ao do Clubinho:
 * chave cifrada no banco, lista de modelos ao vivo, modelo padrão por provedor.
 * Só admin, atrás das flags `content_studio` e `content_studio_provider_admin`.
 */
@Module({
  imports: [ConfigModule, AiProviderSettingsModule, AiRequestQueueModule],
  controllers: [AiProvidersController],
  providers: [AiProvidersConfigService],
  exports: [AiProvidersConfigService],
})
export class AiProviderAdminModule {}
