import { ConfigService } from "@nestjs/config";
import { Test } from "@nestjs/testing";
import { EMAIL_CONFIG_KEYS } from "./email.constants";
import { EmailModule } from "./email.module";
import { EmailService } from "./email.service";
import {
  GmailSmtpTransportOptions,
  SmtpMailOptions,
  SmtpTransport,
} from "./email.types";
import { GmailSmtpTransportFactory } from "./gmail-smtp-transport.factory";

describe("EmailModule", () => {
  it("exports the vendor-neutral email service", async () => {
    const sendMail = jest.fn<Promise<unknown>, [SmtpMailOptions]>();
    const transport: SmtpTransport = { sendMail };
    const createTransport = jest.fn<SmtpTransport, [GmailSmtpTransportOptions]>(
      () => transport,
    );
    const configValues: Record<string, string> = {
      [EMAIL_CONFIG_KEYS.GMAIL_USER]: "sender@gmail.com",
      [EMAIL_CONFIG_KEYS.GMAIL_APP_PASSWORD]: "test-app-password",
    };

    const moduleRef = await Test.createTestingModule({
      imports: [EmailModule],
    })
      .overrideProvider(ConfigService)
      .useValue({
        get: (key: string): string | undefined => configValues[key],
        getOrThrow: (key: string): string => configValues[key],
      })
      .overrideProvider(GmailSmtpTransportFactory)
      .useValue({ create: createTransport })
      .compile();

    expect(moduleRef.get(EmailService)).toBeInstanceOf(EmailService);
  });
});
