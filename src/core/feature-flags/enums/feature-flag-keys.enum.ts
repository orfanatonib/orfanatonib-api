/**
 * Uma flag por recurso, em `snake_case`; o perfil nunca entra no nome (quem
 * enxerga é decidido por `targetRoles`). O catálogo completo (com público e
 * padrão) está em `DEFAULT_FEATURE_FLAGS`.
 */
export enum FeatureFlagKeys {
  PUBLIC_REGISTRATION = "public_registration",
  GOOGLE_LOGIN = "google_login",
  PASSWORD_RECOVERY = "password_recovery",
  CONTACT_FORM = "contact_form",
  EVENTS_SECTION = "events_section",
  SHELTER_FEED = "shelter_feed",
  SHELTER_FEED_CELEBRATIONS = "shelter_feed_celebrations",
  SHELTER_FEED_COMMENTS = "shelter_feed_comments",
  HOME_COMMENTS = "home_comments",
  PUBLIC_GALLERIES = "public_galleries",
  PUBLIC_VIDEOS = "public_videos",
  SHELTER_PAGES = "shelter_pages",
  ABOUT_PAGE = "about_page",
  SHELTER_ADDRESS = "shelter_address",

  MEMBER_AREA = "member_area",
  VISIT_MATERIALS = "visit_materials",
  DOCUMENTS_LIBRARY = "documents_library",
  TRAINING_VIDEOS = "training_videos",
  IDEAS_SHARING = "ideas_sharing",
  IDEA_SUBMISSION = "idea_submission",
  SHELTER_PHOTO_UPLOAD = "shelter_photo_upload",
  SITE_FEEDBACK = "site_feedback",
  MEMBER_MANUAL = "member_manual",
  WEEKLY_MEDITATION = "weekly_meditation",
  INFORMATIVE_BANNERS = "informative_banners",
  COMMENT_SUBMISSION = "comment_submission",
  SHELTERED_AREA = "sheltered_area",
  ACCEPTED_CHRISTS = "accepted_christs",
  ATTENDANCE = "attendance",
  INTEGRATION = "integration",

  COMMENT_MODERATION = "comment_moderation",
  DOCUMENT_MANAGEMENT = "document_management",
  INFORMATIVE_MANAGEMENT = "informative_management",
  FEEDBACK_MANAGEMENT = "feedback_management",
  CONTACT_MANAGEMENT = "contact_management",
  PAGE_MANAGEMENT = "page_management",
  MEDITATION_MANAGEMENT = "meditation_management",
  EVENT_MANAGEMENT = "event_management",
  PHOTO_MODERATION = "photo_moderation",
  IDEA_MODERATION = "idea_moderation",
  USER_MANAGEMENT = "user_management",
  LEADER_MANAGEMENT = "leader_management",
  MEMBER_MANAGEMENT = "member_management",
  SHELTER_MANAGEMENT = "shelter_management",
  SHELTERED_MANAGEMENT = "sheltered_management",
  PAGELAS = "pagelas",
  SHELTER_SCHEDULE = "shelter_schedule",
  CRIMINAL_RECORDS = "criminal_records",
  VISIT_REPORTS = "visit_reports",
  OBSERVABILITY_AUDIT = "observability_audit",

  CONTENT_STUDIO = "content_studio",
  CONTENT_STUDIO_GENERATION = "content_studio_generation",
  CONTENT_STUDIO_REVIEW = "content_studio_review",
  CONTENT_STUDIO_PUBLICATION = "content_studio_publication",
  CONTENT_STUDIO_PROVIDER_ADMIN = "content_studio_provider_admin",

  /**
   * Chave-mestra do envio de e-mail. Desligar interrompe TODOS os tipos,
   * inclusive recuperação de senha — é a alavanca de emergência.
   * As chaves por tipo são `email_<tipo>`, montadas em `emailFeatureFlagKey()`.
   */
  EMAIL_DELIVERY = "email_delivery",
}

/**
 * Flag de um tipo de e-mail. A chave do template vira a chave da flag
 * (`password-reset` → `email_password_reset`; `email-verification` →
 * `email_verification`), então um template novo já nasce com o seu interruptor.
 */
export const emailFeatureFlagKey = (templateKey: string): string => {
  const snake = templateKey.replace(/-/g, "_");
  return snake.startsWith("email_") ? snake : `email_${snake}`;
};
