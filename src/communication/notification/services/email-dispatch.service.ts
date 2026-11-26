import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { GetFeatureFlagsService } from "src/core/feature-flags/services/get-feature-flags.service";
import {
  FeatureFlagKeys,
  emailFeatureFlagKey,
} from "src/core/feature-flags/enums/feature-flag-keys.enum";
import { EmailTemplateKey } from "../enums/email-template-key.enum";
import { renderEmail } from "../templates/email-template.registry";
import {
  EmailRenderContext,
  EmailTemplateDataMap,
  OutboxEnqueueInput,
} from "../types";
import { NOTIFICATION_CONFIG } from "../constants/notification.constants";
import { EmailOutboxService } from "../outbox/email-outbox.service";

export interface DispatchOptions {
  /** Não enfileira a mesma chave duas vezes. */
  readonly dedupeKey?: string;
  readonly scheduledFor?: Date;
}

/**
 * Ponto único de saída de e-mail: renderiza, consulta as feature flags e
 * entrega à fila. Nenhum módulo de domínio monta HTML nem fala com SMTP.
 */
@Injectable()
export class EmailDispatchService {
  private readonly logger = new Logger(EmailDispatchService.name);

  constructor(
    private readonly outbox: EmailOutboxService,
    private readonly featureFlags: GetFeatureFlagsService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * `data` é validado contra `templateKey` em tempo de compilação: o payload
   * de um template não passa no outro.
   */
  async dispatch<TKey extends EmailTemplateKey>(
    templateKey: TKey,
    data: EmailTemplateDataMap[TKey],
    recipients: readonly string[],
    options: DispatchOptions = {},
  ): Promise<void> {
    const rendered = renderEmail(templateKey, data, this.renderContext());

    const payload: OutboxEnqueueInput = {
      templateKey,
      recipients,
      rendered,
      dedupeKey: options.dedupeKey,
      scheduledFor: options.scheduledFor,
    };

    if (!(await this.isEnabled(templateKey))) {
      // Fica registrado no outbox como `skipped`: desligar o envio não pode
      // apagar o rastro de que a aplicação quis avisar alguém.
      await this.outbox.recordSkipped(payload);
      return;
    }

    await this.outbox.enqueue(payload);
  }

  /** A chave-mestra e a do tipo; ambas vêm ligadas se nunca foram cadastradas. */
  async isEnabled(templateKey: EmailTemplateKey): Promise<boolean> {
    const deliveryEnabled = await this.featureFlags.isEnabledOrDefault(
      FeatureFlagKeys.EMAIL_DELIVERY,
      true,
    );
    if (!deliveryEnabled) return false;

    return this.featureFlags.isEnabledOrDefault(
      emailFeatureFlagKey(templateKey),
      true,
    );
  }

  renderContext(): EmailRenderContext {
    return {
      appUrl: this.appUrl(),
      logoUrl: this.logoUrl(),
    };
  }

  /** Endereço do frontend, usado nos links dos e-mails. */
  appUrl(): string {
    const configured = this.configService
      .get<string>(NOTIFICATION_CONFIG.APP_URL_KEY)
      ?.trim();
    if (configured) return configured.replace(/\/+$/, "");

    const environment =
      this.configService.get<string>("ENVIRONMENT") ??
      NOTIFICATION_CONFIG.LOCAL_ENVIRONMENT;

    if (NOTIFICATION_CONFIG.PRODUCTION_ENVIRONMENTS.includes(environment)) {
      return NOTIFICATION_CONFIG.PRODUCTION_BASE_URL;
    }
    if (environment === NOTIFICATION_CONFIG.STAGING_ENVIRONMENT) {
      return NOTIFICATION_CONFIG.STAGING_BASE_URL;
    }
    return NOTIFICATION_CONFIG.LOCAL_BASE_URL;
  }

  private logoUrl(): string | undefined {
    return (
      this.configService
        .get<string>(NOTIFICATION_CONFIG.LOGO_URL_KEY)
        ?.trim() ||
      this.configService
        .get<string>(NOTIFICATION_CONFIG.LEGACY_LOGO_URL_KEY)
        ?.trim() ||
      undefined
    );
  }
}
