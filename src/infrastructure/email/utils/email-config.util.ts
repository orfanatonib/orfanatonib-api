import { ConfigService } from "@nestjs/config";
import { EMAIL_ERROR_MESSAGES } from "../email.constants";

export function getRequiredEmailConfig(
  configService: ConfigService,
  key: string,
): string {
  const value = getOptionalEmailConfig(configService, key);

  if (!value) {
    throw new Error(EMAIL_ERROR_MESSAGES.REQUIRED_CONFIG(key));
  }

  return value;
}

/** Valor da configuração, ou `null` quando ausente ou em branco. */
export function getOptionalEmailConfig(
  configService: ConfigService,
  key: string,
): string | null {
  return configService.get<string>(key)?.trim() || null;
}
