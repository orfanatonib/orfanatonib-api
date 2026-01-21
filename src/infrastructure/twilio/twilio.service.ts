import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Twilio } from 'twilio';

@Injectable()
export class TwilioService {
    private readonly logger = new Logger(TwilioService.name);
    private readonly twilio: Twilio;

    constructor(private readonly configService: ConfigService) {
        const accountSid = this.configService.get<string>('TWILIO_ACCOUNT_SID') ?? '';
        const authToken = this.configService.get<string>('TWILIO_AUTH_TOKEN') ?? '';

        this.twilio = new Twilio(accountSid, authToken);
    }

    async sendWhatsAppMessage(
        from: string,
        to: string,
        message: string,
    ): Promise<void> {
        try {
            await this.twilio.messages.create({
                body: message,
                from,
                to,
            });
            this.logger.log(`WhatsApp message sent successfully to: ${to}`);
        } catch (error) {
            this.logger.error(`Error sending WhatsApp message: ${error.message}`);
            throw new Error('Error sending WhatsApp message');
        }
    }
}
