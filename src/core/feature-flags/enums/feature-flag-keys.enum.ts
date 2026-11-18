export enum FeatureFlagKeys {
  SHELTER_ADDRESS = "shelter-address",
  SHELTER_MANAGEMENT = "shelter-management",
  SHELTER_PAGELAS = "shelter-pagelas",
  CONTENT_STUDIO = "content-studio",
  CONTENT_STUDIO_GENERATION = "content-studio-generation",
  CONTENT_STUDIO_REVIEW = "content-studio-review",
  CONTENT_STUDIO_PUBLICATION = "content-studio-publication",
  CONTENT_STUDIO_PROVIDER_ADMIN = "content-studio-provider-admin",

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
