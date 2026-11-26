/**
 * Identidade visual dos e-mails.
 *
 * As cores estavam declaradas como `const` locais **dentro** do método
 * `BaseEmailTemplate.generate`, o que impedia qualquer outro template de
 * reaproveitá-las — e foi como os templates de contato e de evento acabaram
 * com paletas próprias, ligeiramente diferentes.
 */
export const EMAIL_THEME = {
  BLACK: "#000000",
  WHITE: "#FFFFFF",
  YELLOW: "#FFD700",
  GREEN: "#00A651",
  RED: "#E10600",
  BLUE: "#4F46E5",
  BACKGROUND: "#F5F6F8",
  TEXT_MUTED: "#5B5E66",
  BORDER: "#E3E5E9",
} as const;

export const EMAIL_LAYOUT = {
  MAX_WIDTH_PX: 600,
  FONT_STACK: "Arial, Helvetica, sans-serif",
  RADIUS_PX: 8,
} as const;

/** Tom do aviso destacado no corpo do e-mail. */
export enum EmailCalloutTone {
  INFO = "info",
  SUCCESS = "success",
  WARNING = "warning",
  DANGER = "danger",
}

export const EMAIL_CALLOUT_COLOR: Readonly<Record<EmailCalloutTone, string>> = {
  [EmailCalloutTone.INFO]: EMAIL_THEME.BLUE,
  [EmailCalloutTone.SUCCESS]: EMAIL_THEME.GREEN,
  [EmailCalloutTone.WARNING]: EMAIL_THEME.YELLOW,
  [EmailCalloutTone.DANGER]: EMAIL_THEME.RED,
};
