import { ConfigService } from '@nestjs/config';
import { EMAIL_ERROR_MESSAGES } from '../email.constants';

export function getRequiredEmailConfig(
  configService: ConfigService,
  key: string,
): string {
  const value = configService.getOrThrow<string>(key).trim();

  if (!value) {
    throw new Error(EMAIL_ERROR_MESSAGES.REQUIRED_CONFIG(key));
  }

  return value;
}
