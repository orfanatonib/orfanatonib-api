import { GMAIL_SMTP_CONFIG } from "./email.constants";
import { GmailSmtpTransportFactory } from "./gmail-smtp-transport.factory";

describe("GmailSmtpTransportFactory", () => {
  it("creates a Nodemailer transport without opening a network connection", () => {
    const factory = new GmailSmtpTransportFactory();

    const transport = factory.create({
      host: GMAIL_SMTP_CONFIG.HOST,
      port: GMAIL_SMTP_CONFIG.PORT,
      secure: GMAIL_SMTP_CONFIG.SECURE,
      auth: {
        user: "sender@gmail.com",
        pass: "test-app-password",
      },
      connectionTimeout: GMAIL_SMTP_CONFIG.CONNECTION_TIMEOUT_MS,
      greetingTimeout: GMAIL_SMTP_CONFIG.GREETING_TIMEOUT_MS,
      socketTimeout: GMAIL_SMTP_CONFIG.SOCKET_TIMEOUT_MS,
    });

    expect(typeof transport.sendMail).toBe("function");
  });
});
