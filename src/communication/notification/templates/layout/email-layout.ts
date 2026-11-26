import { EmailConstants } from "../../constants/email.constants";
import {
  EMAIL_CALLOUT_COLOR,
  EMAIL_LAYOUT,
  EMAIL_THEME,
  EmailCalloutTone,
} from "../../constants/email-theme.constants";

/**
 * Blocos reutilizáveis do corpo do e-mail. Cada template compõe estes pedaços
 * em vez de escrever HTML solto — era o que acontecia dentro do
 * `NotificationService`, com `<div style="...">` no meio do método.
 */

/** Escapa o que vem do usuário antes de entrar no HTML. */
export const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

export const paragraph = (text: string): string =>
  `<p style="margin: 0 0 16px; font-size: 15px; line-height: 1.6; color: ${EMAIL_THEME.BLACK};">${text}</p>`;

export const mutedParagraph = (text: string): string =>
  `<p style="margin: 0 0 12px; font-size: 13px; line-height: 1.5; color: ${EMAIL_THEME.TEXT_MUTED};">${text}</p>`;

export const button = (label: string, url: string): string => `
  <table cellpadding="0" cellspacing="0" role="presentation" style="margin: 24px auto;">
    <tr>
      <td align="center" style="background-color: ${EMAIL_THEME.BLUE}; border-radius: 6px;">
        <a href="${url}" style="display: inline-block; padding: 13px 28px; color: ${EMAIL_THEME.WHITE}; font-family: ${EMAIL_LAYOUT.FONT_STACK}; font-size: 15px; font-weight: bold; text-decoration: none;">${escapeHtml(label)}</a>
      </td>
    </tr>
  </table>`;

/** O link em texto, para quem não consegue clicar no botão. */
export const fallbackLink = (url: string): string =>
  `${mutedParagraph("Ou copie e cole o endereço abaixo no seu navegador:")}
   <p style="margin: 0 0 16px; font-size: 12px; color: ${EMAIL_THEME.BLUE}; word-break: break-all;">${url}</p>`;

export const callout = (
  text: string,
  tone: EmailCalloutTone = EmailCalloutTone.INFO,
): string => `
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin: 0 0 16px;">
    <tr>
      <td style="border-left: 4px solid ${EMAIL_CALLOUT_COLOR[tone]}; background-color: ${EMAIL_THEME.BACKGROUND}; padding: 12px 16px; font-size: 14px; line-height: 1.5; color: ${EMAIL_THEME.BLACK};">${text}</td>
    </tr>
  </table>`;

/** Lista rótulo/valor — contato, feedback, detalhes de evento. */
export const definitionList = (
  rows: ReadonlyArray<{ label: string; value: string }>,
): string => `
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin: 0 0 16px; border: 1px solid ${EMAIL_THEME.BORDER}; border-radius: 6px;">
    ${rows
      .map(
        ({ label, value }, index) => `
      <tr>
        <td style="padding: 10px 14px; font-size: 13px; font-weight: bold; color: ${EMAIL_THEME.TEXT_MUTED}; width: 35%; ${index > 0 ? `border-top: 1px solid ${EMAIL_THEME.BORDER};` : ""}">${escapeHtml(label)}</td>
        <td style="padding: 10px 14px; font-size: 14px; color: ${EMAIL_THEME.BLACK}; ${index > 0 ? `border-top: 1px solid ${EMAIL_THEME.BORDER};` : ""}">${escapeHtml(value)}</td>
      </tr>`,
      )
      .join("")}
  </table>`;

/** Bloco de texto livre enviado por alguém — preserva as quebras de linha. */
export const quotedText = (text: string): string => `
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin: 0 0 16px;">
    <tr>
      <td style="background-color: ${EMAIL_THEME.BACKGROUND}; border-radius: 6px; padding: 14px 16px; font-size: 14px; line-height: 1.6; color: ${EMAIL_THEME.BLACK}; white-space: pre-wrap;">${escapeHtml(text)}</td>
    </tr>
  </table>`;

export interface EmailShellInput {
  title: string;
  /** Saudação; omitido em e-mails para caixa coletiva. */
  greetingName?: string;
  body: string;
  logoUrl?: string;
}

/** A moldura: cabeçalho, corpo e rodapé. */
export const renderEmailShell = ({
  title,
  greetingName,
  body,
  logoUrl,
}: EmailShellInput): string => {
  const header = logoUrl
    ? `<img src="${logoUrl}" alt="${EmailConstants.APP_NAME}" style="max-height: 56px; display: block; margin: 0 auto;">`
    : `<h1 style="margin: 0; color: ${EMAIL_THEME.BLACK}; font-size: 26px; font-weight: 900; text-transform: uppercase; letter-spacing: 2px;">${EmailConstants.APP_NAME}</h1>`;

  const greeting = greetingName
    ? paragraph(`Olá <strong>${escapeHtml(greetingName)}</strong>,`)
    : "";

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)} - ${EmailConstants.APP_NAME}</title>
</head>
<body style="margin: 0; padding: 0; background-color: ${EMAIL_THEME.BACKGROUND}; font-family: ${EMAIL_LAYOUT.FONT_STACK}; color: ${EMAIL_THEME.BLACK};">
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background-color: ${EMAIL_THEME.BACKGROUND}; padding: 24px 12px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="max-width: ${EMAIL_LAYOUT.MAX_WIDTH_PX}px; background-color: ${EMAIL_THEME.WHITE}; border-radius: ${EMAIL_LAYOUT.RADIUS_PX}px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.08);">
          <tr>
            <td style="background-color: ${EMAIL_THEME.YELLOW}; padding: 28px 24px; text-align: center; border-bottom: 4px solid ${EMAIL_THEME.BLACK};">
              ${header}
            </td>
          </tr>
          <tr>
            <td style="padding: 28px 24px;">
              <h2 style="margin: 0 0 18px; font-size: 20px; color: ${EMAIL_THEME.BLACK};">${escapeHtml(title)}</h2>
              ${greeting}
              ${body}
            </td>
          </tr>
          <tr>
            <td style="background-color: ${EMAIL_THEME.BLACK}; padding: 20px 24px; text-align: center;">
              <p style="margin: 0 0 6px; font-size: 12px; color: ${EMAIL_THEME.YELLOW};">${EmailConstants.SLOGAN}</p>
              <p style="margin: 0 0 6px; font-size: 11px; color: ${EMAIL_THEME.WHITE};">${EmailConstants.AUTO_REPLY_NOTICE}</p>
              <p style="margin: 0; font-size: 11px; color: ${EMAIL_THEME.TEXT_MUTED};">${EmailConstants.COPYRIGHT(new Date().getFullYear())}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
};
