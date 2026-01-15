export class EmailTemplateGenerator {
    static generate(title: string, userName: string, bodyContent: string): string {
        const logoUrl = process.env.APP_LOGO_URL || '';

        const COLOR_BLACK = '#000000';
        const COLOR_WHITE = '#FFFFFF';
        const COLOR_YELLOW = '#FFD700';
        const COLOR_GREEN = '#00A651';
        const COLOR_RED = '#E10600';
        const COLOR_BG = '#F5F6F8';
        const COLOR_TEXT_MUTED = '#5B5E66';

        const headerContent = logoUrl
            ? `<img src="${logoUrl}" alt="Orfanato NIB" width="160" style="max-width: 220px; width: 220px; height: auto; display: block; margin: 0 auto;" />`
            : `<div style="height: 72px; line-height: 72px; font-size: 18px; font-weight: 700; color: ${COLOR_BLACK};">Orfanato NIB</div>`;

        return `
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${title} - Orfanato NIB</title>
      </head>
      <body style="margin: 0; padding: 0; background-color: ${COLOR_BG}; font-family: Arial, sans-serif; color: ${COLOR_BLACK};">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: ${COLOR_BG}; padding: 24px;">
          <tr>
            <td align="center">
              <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: ${COLOR_WHITE}; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
                
                <tr>
                  <td style="background-color: ${COLOR_WHITE}; padding: 20px 24px; text-align: center;">
                    ${headerContent}
                  </td>
                </tr>

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

                <tr>
                  <td style="background-color: ${COLOR_YELLOW}; padding: 26px 24px; text-align: center; border-bottom: 4px solid ${COLOR_BLACK};">
                    <h1 style="margin: 0; color: ${COLOR_BLACK}; font-size: 24px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px;">
                      ${title}
                    </h1>
                  </td>
                </tr>

                <tr>
                  <td style="padding: 30px 24px; background-color: ${COLOR_WHITE}; line-height: 1.6;">
                    <p style="margin-top: 0;">Olá, <strong>${userName}</strong>,</p>
                    ${bodyContent}
                    
                    <p style="margin-top: 30px; font-size: 13px; color: ${COLOR_TEXT_MUTED}; border-top: 1px solid #eee; padding-top: 20px;">
                      Se você não solicitou esta ação, por favor ignore este email.
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
                
                <tr>
                  <td style="background-color: ${COLOR_WHITE}; padding: 18px 24px; text-align: center;">
                    <p style="margin: 0; color: ${COLOR_BLACK}; font-size: 14px; font-weight: 700;">
                      Orfanato NIB
                    </p>
                    <p style="margin: 5px 0 0; color: ${COLOR_TEXT_MUTED}; font-size: 12px;">
                      &copy; ${new Date().getFullYear()} Todos os direitos reservados.
                    </p>
                  </td>
                </tr>

              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;
    }
}
