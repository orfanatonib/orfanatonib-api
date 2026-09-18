import { Injectable } from "@nestjs/common";
import { EmailMessage } from "../email.types";
import { GmailSmtpProvider } from "../gmail-smtp.provider";

@Injectable()
export class EmailService {
  constructor(private readonly gmailSmtpProvider: GmailSmtpProvider) {}

  async dispatch(message: EmailMessage): Promise<void> {
    await this.gmailSmtpProvider.send(message);
  }

  async dispatchBulk(messages: readonly EmailMessage[]): Promise<void> {
    for (const message of messages) {
      await this.dispatch(message);
    }
  }
}
