export enum FeatureFlagKeys {
  SHELTER_ADDRESS = "shelter-address",
  SHELTER_MANAGEMENT = "shelter-management",
  SHELTER_PAGELAS = "shelter-pagelas",

  /**
   * Chave-mestra do envio de e-mail. Desligar interrompe TODOS os tipos,
   * inclusive recuperação de senha — é a alavanca de emergência.
   * As chaves por tipo são `email-<EmailTemplateKey>`, montadas em
   * `emailFeatureFlagKey()`.
   */
  EMAIL_DELIVERY = "email-delivery",
}

/**
 * Flag de um tipo de e-mail. A chave do template vira a chave da flag, então
 * um template novo já nasce com o seu interruptor.
 */
export const emailFeatureFlagKey = (templateKey: string): string =>
  `email-${templateKey}`;
