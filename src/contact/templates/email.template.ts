import { ContactEntity } from '../contact.entity';

export class EmailTemplate {
  static generateContactEmailTemplate(contact: ContactEntity): string {
    return `
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Novo Contato - Orfanato NIB</title>
      </head>
      <body style="margin: 0; padding: 0; background-color: #000000; font-family: Arial, sans-serif;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #000000; padding: 24px;">
          <tr>
            <td align="center">
              <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #FFFFFF; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.3);">
                <!-- Header -->
                <tr>
                  <td style="background-color: #FFD700; padding: 32px 24px; text-align: center; border-bottom: 4px solid #000000;">
                    <h1 style="margin: 0; color: #000000; font-size: 32px; font-weight: bold; text-transform: uppercase; letter-spacing: 2px;">
                      💚 Orfanato NIB
                    </h1>
                    <p style="margin: 12px 0 0; color: #000000; font-size: 18px; font-weight: 600;">
                      Nova Mensagem de Contato
                    </p>
                  </td>
                </tr>
                
                <!-- Content -->
                <tr>
                  <td style="padding: 32px 24px; background-color: #FFFFFF;">
                    <table width="100%" cellpadding="0" cellspacing="0" style="font-size: 16px; color: #000000; line-height: 1.6;">
                      <!-- Nome -->
                      <tr>
                        <td style="padding-bottom: 16px; border-bottom: 2px solid #FFD700;">
                          <table width="100%" cellpadding="0" cellspacing="0">
                            <tr>
                              <td style="width: 120px; vertical-align: top;">
                                <strong style="color: #000000; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">👤 Nome:</strong>
                              </td>
                              <td style="color: #000000; font-size: 16px; font-weight: 500;">
                                ${this.escapeHtml(contact.name)}
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      
                      <!-- Email -->
                      <tr>
                        <td style="padding: 16px 0; border-bottom: 2px solid #FFD700;">
                          <table width="100%" cellpadding="0" cellspacing="0">
                            <tr>
                              <td style="width: 120px; vertical-align: top;">
                                <strong style="color: #000000; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">📧 E-mail:</strong>
                              </td>
                              <td style="color: #000000; font-size: 16px; font-weight: 500;">
                                <a href="mailto:${this.escapeHtml(contact.email)}" style="color: #000000; text-decoration: underline;">
                                  ${this.escapeHtml(contact.email)}
                                </a>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      
                      <!-- Telefone -->
                      <tr>
                        <td style="padding: 16px 0; border-bottom: 2px solid #FFD700;">
                          <table width="100%" cellpadding="0" cellspacing="0">
                            <tr>
                              <td style="width: 120px; vertical-align: top;">
                                <strong style="color: #000000; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">📱 Telefone:</strong>
                              </td>
                              <td style="color: #000000; font-size: 16px; font-weight: 500;">
                                <a href="tel:${this.escapeHtml(contact.phone)}" style="color: #000000; text-decoration: underline;">
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
                          <strong style="color: #000000; font-size: 14px; text-transform: uppercase; letter-spacing: 1px; display: block; margin-bottom: 12px;">
                            💬 Mensagem:
                          </strong>
                          <div style="background-color: #FFD700; padding: 20px; border-left: 6px solid #000000; border-radius: 4px; color: #000000; font-size: 15px; line-height: 1.8; white-space: pre-line; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                            ${this.escapeHtml(contact.message)}
                          </div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                
                <!-- Footer -->
                <tr>
                  <td style="background-color: #000000; padding: 24px; text-align: center; border-top: 4px solid #FFD700;">
                    <p style="margin: 0; color: #FFD700; font-size: 16px; font-weight: 600;">
                      💙 Obrigado por usar o <strong style="color: #FFFFFF;">Orfanato NIB</strong>
                    </p>
                    <p style="margin: 12px 0 0; color: #FFFFFF; font-size: 12px; opacity: 0.8;">
                      Este é um email automático, por favor não responda.
                    </p>
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
