import { EmailConstants } from '../constants/email.constants';
import {
  EventAction,
  EventNotificationMessages,
} from '../../../content/event/constants/event-notification.constants';

export interface EventEmailData {
  title: string;
  description?: string;
  date: string;
  location?: string;
}

export class EventEmailTemplate {
  static generate(event: EventEmailData, action: EventAction): string {
    const messages =
      EventNotificationMessages[
      action.toUpperCase() as keyof typeof EventNotificationMessages
      ];

    const COLOR_BLACK = '#000000';
    const COLOR_WHITE = '#FFFFFF';
    const COLOR_YELLOW = '#FFD700';
    const COLOR_GREEN = '#00A651';
    const COLOR_RED = '#E10600';
    const COLOR_BG = '#F5F6F8';
    const COLOR_TEXT_MUTED = '#5B5E66';

    const actionColor =
      action === EventAction.DELETED || action === EventAction.LOST_ACCESS
        ? COLOR_RED
        : COLOR_GREEN;

    return `
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${messages.title} - ${EmailConstants.APP_NAME}</title>
      </head>
      <body style="margin: 0; padding: 0; background-color: ${COLOR_BG}; font-family: Arial, sans-serif;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: ${COLOR_BG}; padding: 24px;">
          <tr>
            <td align="center">
              <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: ${COLOR_WHITE}; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
                <tr>
                  <td style="background-color: ${COLOR_YELLOW}; padding: 30px 24px; text-align: center; border-bottom: 4px solid ${COLOR_BLACK};">
                    <h1 style="margin: 0; color: ${COLOR_BLACK}; font-size: 28px; font-weight: 900; text-transform: uppercase; letter-spacing: 2.5px;">
                      ${EmailConstants.APP_NAME}
                    </h1>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 0; background-color: ${COLOR_WHITE};">
                    <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
                      <tr>
                        <td style="height: 8px; background-color: ${COLOR_GREEN};">&nbsp;</td>
                        <td style="height: 8px; background-color: ${COLOR_RED};">&nbsp;</td>
                        <td style="height: 8px; background-color: ${COLOR_YELLOW};">&nbsp;</td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="background-color: ${COLOR_WHITE}; padding: 26px 24px; text-align: center;">
                    <h2 style="margin: 0; color: ${actionColor}; font-size: 20px; font-weight: 800; text-transform: uppercase; letter-spacing: 1.5px;">
                      ${messages.title}
                    </h2>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 28px 24px; background-color: ${COLOR_WHITE};">
                    <p style="margin: 0 0 10px; font-size: 16px; color: ${COLOR_BLACK};">
                      ${this.getActionMessage(event, action)}
                    </p>
                    <p style="margin: 0 0 24px; font-size: 14px; color: ${COLOR_TEXT_MUTED};">
                      ${messages.description}
                    </p>

                    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: ${COLOR_BG}; border-radius: 8px;">
                      <tr>
                        <td style="padding: 20px;">
                          <p style="margin: 0 0 12px; font-size: 14px; color: ${COLOR_BLACK};"><strong>Data:</strong> ${this.formatDate(event.date)}</p>
                          ${event.location ? `<p style="margin: 0 0 12px; font-size: 14px; color: ${COLOR_BLACK};"><strong>Local:</strong> ${this.escapeHtml(event.location)}</p>` : ''}
                          ${event.description ? `<p style="margin: 0; font-size: 14px; color: ${COLOR_BLACK};"><strong>Descricao:</strong> ${this.escapeHtml(event.description)}</p>` : ''}
                        </td>
                      </tr>
                    </table>

                    <p style="margin: 24px 0 0; font-size: 15px; color: ${actionColor}; font-weight: 600; text-align: center;">
                      ${messages.callToAction}
                    </p>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 0; background-color: ${COLOR_WHITE};">
                    <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
                      <tr>
                        <td style="height: 6px; background-color: ${COLOR_GREEN};">&nbsp;</td>
                        <td style="height: 6px; background-color: ${COLOR_RED};">&nbsp;</td>
                        <td style="height: 6px; background-color: ${COLOR_YELLOW};">&nbsp;</td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="background-color: ${COLOR_WHITE}; padding: 24px; text-align: center;">
                    <p style="margin: 0; color: ${COLOR_BLACK}; font-size: 15px; font-weight: 700;">
                      ${EmailConstants.SLOGAN}
                    </p>
                    <p style="margin: 12px 0 0; color: ${COLOR_TEXT_MUTED}; font-size: 12px;">
                      ${EmailConstants.AUTO_REPLY_NOTICE}
                    </p>
                    <p style="margin: 5px 0 0; color: ${COLOR_TEXT_MUTED}; font-size: 12px;">
                      ${EmailConstants.COPYRIGHT(new Date().getFullYear())}
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

  private static formatDate(dateString: string): string {
    if (!dateString) return '';

    const months = [
      'Janeiro',
      'Fevereiro',
      'Março',
      'Abril',
      'Maio',
      'Junho',
      'Julho',
      'Agosto',
      'Setembro',
      'Outubro',
      'Novembro',
      'Dezembro',
    ];

    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return dateString;

      const day = date.getDate();
      const month = months[date.getMonth()];
      const year = date.getFullYear();

      return `${day} de ${month} de ${year}`;
    } catch {
      return dateString;
    }
  }

  private static getActionMessage(event: EventEmailData, action: EventAction): string {
    const eventTitle = `<strong>"${this.escapeHtml(event.title)}"</strong>`;

    switch (action) {
      case EventAction.DATE_CHANGED:
        return `O evento ${eventTitle} mudou para o dia <strong>${this.formatDate(event.date)}</strong>.`;

      case EventAction.LOCATION_CHANGED:
        return `O evento ${eventTitle} mudou de local para <strong>${this.escapeHtml(event.location || '')}</strong>.`;

      case EventAction.CREATED:
        return `O evento ${eventTitle} foi criado.`;

      case EventAction.UPDATED:
        return `O evento ${eventTitle} foi atualizado.`;

      case EventAction.DELETED:
        return `O evento ${eventTitle} foi cancelado.`;

      case EventAction.AUDIENCE_CHANGED:
        return `O evento ${eventTitle} teve seu publico alvo alterado.`;

      case EventAction.LOST_ACCESS:
        return `O evento ${eventTitle} nao esta mais disponivel para voce devido a mudanca no publico alvo.`;

      default:
        return `O evento ${eventTitle} foi atualizado.`;
    }
  }
}
