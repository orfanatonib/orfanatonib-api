import { ContactEntity } from '../contact.entity';

export class EmailTemplate {
  static generateContactEmailTemplate(contact: ContactEntity): string {
    const logoUrl =
      process.env.CONTACT_EMAIL_LOGO_URL ||
      process.env.EMAIL_LOGO_URL ||
      process.env.APP_LOGO_URL ||
      '';
    const hasLogo = Boolean(logoUrl);

    // Brand palette (logo): black/white + green/red/yellow accents
    const COLOR_BLACK = '#000000';
    const COLOR_WHITE = '#FFFFFF';
    const COLOR_YELLOW = '#FFD700';
    const COLOR_GREEN = '#00A651';
    const COLOR_RED = '#E10600';
    const COLOR_BG = '#F5F6F8';
    const COLOR_TEXT_MUTED = '#5B5E66';

    return `
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Novo Contato - Orfanato NIB</title>
      </head>
      <body style="margin: 0; padding: 0; background-color: ${COLOR_BG}; font-family: Arial, sans-serif;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: ${COLOR_BG}; padding: 24px;">
          <tr>
            <td align="center">
              <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: ${COLOR_WHITE}; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.35);">
                <!-- Logo -->
                <tr>
                  <td style="background-color: ${COLOR_WHITE}; padding: 20px 24px; text-align: center;">
                    ${
                      logoUrl
                        ? `
                          <img
                            src="${this.escapeHtml(logoUrl)}"
                            alt=""
                            width="160"
                            style="max-width: 220px; width: 220px; height: auto; display: block; margin: 0 auto; border: 0; outline: none; text-decoration: none;"
                          />
                        `
                        : `
                          <div style="height: 72px; line-height: 72px; font-size: 18px; font-weight: 700; color: ${COLOR_WHITE};">
                            Orfanato NIB
                          </div>
                        `
                    }
                  </td>
                </tr>
                <!-- Brand bar -->
                <tr>
                  <td style="padding: 0; background-color: ${COLOR_WHITE};">
                    <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
                      <tr>
                        <td style="height: 8px; background-color: ${COLOR_GREEN}; font-size: 0; line-height: 0;">&nbsp;</td>
                        <td style="height: 8px; background-color: ${COLOR_RED}; font-size: 0; line-height: 0;">&nbsp;</td>
                        <td style="height: 8px; background-color: ${COLOR_YELLOW}; font-size: 0; line-height: 0;">&nbsp;</td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <!-- Header -->
                <tr>
                  <td style="background-color: ${COLOR_YELLOW}; padding: 26px 24px; text-align: center; border-bottom: 4px solid ${COLOR_BLACK};">
                    ${
                      hasLogo
                        ? ''
                        : `
                          <h1 style="margin: 0; color: ${COLOR_BLACK}; font-size: 30px; font-weight: bold; text-transform: uppercase; letter-spacing: 2px;">
                            💚 Orfanato NIB
                          </h1>
                        `
                    }
                    <p style="margin: ${hasLogo ? '0' : '10px'} 0 0; color: ${COLOR_BLACK}; font-size: 18px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px;">
                      Nova Mensagem de Contato
                    </p>
                  </td>
                </tr>
                
                <!-- Content -->
                <tr>
                  <td style="padding: 28px 24px; background-color: ${COLOR_WHITE};">
                    <table width="100%" cellpadding="0" cellspacing="0" style="font-size: 16px; color: ${COLOR_BLACK}; line-height: 1.6;">
                      <!-- Nome -->
                      <tr>
                        <td style="padding-bottom: 16px; border-bottom: 2px solid ${COLOR_YELLOW};">
                          <table width="100%" cellpadding="0" cellspacing="0">
                            <tr>
                              <td style="width: 120px; vertical-align: top;">
                                <strong style="color: ${COLOR_BLACK}; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">👤 Nome:</strong>
                              </td>
                              <td style="color: ${COLOR_BLACK}; font-size: 16px; font-weight: 500;">
                                ${this.escapeHtml(contact.name)}
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      
                      <!-- Email -->
                      <tr>
                        <td style="padding: 16px 0; border-bottom: 2px solid ${COLOR_YELLOW};">
                          <table width="100%" cellpadding="0" cellspacing="0">
                            <tr>
                              <td style="width: 120px; vertical-align: top;">
                                <strong style="color: ${COLOR_BLACK}; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">📧 E-mail:</strong>
                              </td>
                              <td style="color: ${COLOR_BLACK}; font-size: 16px; font-weight: 500;">
                                <a href="mailto:${this.escapeHtml(contact.email)}" style="color: ${COLOR_GREEN}; text-decoration: underline;">
                                  ${this.escapeHtml(contact.email)}
                                </a>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      
                      <!-- Telefone -->
                      <tr>
                        <td style="padding: 16px 0; border-bottom: 2px solid ${COLOR_YELLOW};">
                          <table width="100%" cellpadding="0" cellspacing="0">
                            <tr>
                              <td style="width: 120px; vertical-align: top;">
                                <strong style="color: ${COLOR_BLACK}; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">📱 Telefone:</strong>
                              </td>
                              <td style="color: ${COLOR_BLACK}; font-size: 16px; font-weight: 500;">
                                <a href="tel:${this.escapeHtml(contact.phone)}" style="color: ${COLOR_GREEN}; text-decoration: underline;">
                                  ${this.escapeHtml(contact.phone)}
                                </a>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      
                      <!-- Mensagem -->
                      <tr>
                        <td style="padding-top: 24px;">
                          <strong style="color: ${COLOR_BLACK}; font-size: 14px; text-transform: uppercase; letter-spacing: 1px; display: block; margin-bottom: 12px;">
                            💬 Mensagem:
                          </strong>
                          <div style="background-color: ${COLOR_YELLOW}; padding: 20px; border-left: 6px solid ${COLOR_RED}; border-top: 3px solid ${COLOR_GREEN}; border-radius: 4px; color: ${COLOR_BLACK}; font-size: 15px; line-height: 1.8; white-space: pre-line; box-shadow: 0 2px 4px rgba(0,0,0,0.12);">
                            ${this.escapeHtml(contact.message)}
                          </div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                
                <!-- Footer -->
                <tr>
                  <td style="background-color: ${COLOR_WHITE}; padding: 18px 24px; text-align: center;">
                    <p style="margin: 0; color: ${COLOR_BLACK}; font-size: 14px; font-weight: 700;">
                      Obrigado por usar o <strong style="color: ${COLOR_BLACK};">Orfanato NIB</strong>
                    </p>
                    <p style="margin: 10px 0 0; color: ${COLOR_TEXT_MUTED}; font-size: 12px;">
                      Este é um email automático, por favor não responda.
                    </p>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 0; background-color: ${COLOR_WHITE};">
                    <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
                      <tr>
                        <td style="height: 6px; background-color: ${COLOR_GREEN}; font-size: 0; line-height: 0;">&nbsp;</td>
                        <td style="height: 6px; background-color: ${COLOR_RED}; font-size: 0; line-height: 0;">&nbsp;</td>
                        <td style="height: 6px; background-color: ${COLOR_YELLOW}; font-size: 0; line-height: 0;">&nbsp;</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `.trim();
  }

  private static escapeHtml(text: string): string {
    if (!text) return '';
    const map: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;',
    };
    return text.replace(/[&<>"']/g, (m) => map[m]);
  }
}
