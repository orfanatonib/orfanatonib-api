import { Test } from "@nestjs/testing";
import { EmailMessage } from "../email.types";
import { EmailService } from "./email.service";
import { GmailSmtpProvider } from "../gmail-smtp.provider";

describe("EmailService", () => {
  const send = jest.fn<Promise<void>, [EmailMessage]>();
  let service: EmailService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const moduleRef = await Test.createTestingModule({
      providers: [
        EmailService,
        { provide: GmailSmtpProvider, useValue: { send } },
      ],
    }).compile();

    service = moduleRef.get(EmailService);
  });

  it("dispatches one vendor-neutral email message", async () => {
    const message: EmailMessage = {
      to: "recipient@example.com",
      subject: "Assunto",
      text: "Conteúdo",
    };

    await service.dispatch(message);

    expect(send).toHaveBeenCalledWith(message);
  });

  it("dispatches bulk messages sequentially", async () => {
    const messages: readonly EmailMessage[] = [
      { to: "first@example.com", subject: "Primeiro", text: "Um" },
      { to: "second@example.com", subject: "Segundo", text: "Dois" },
    ];

    await service.dispatchBulk(messages);

    expect(send).toHaveBeenNthCalledWith(1, messages[0]);
    expect(send).toHaveBeenNthCalledWith(2, messages[1]);
  });
});
