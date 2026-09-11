import { Test } from "@nestjs/testing";
import { EmailService } from "src/infrastructure/email/email.service";
import { EmailOutboxWorker } from "./email-outbox.worker";
import { EmailOutboxService } from "./email-outbox.service";
import { EmailOutboxEntity } from "./email-outbox.entity";
import { EmailOutboxStatus } from "../enums/email-outbox-status.enum";
import { EmailTemplateKey } from "../enums/email-template-key.enum";

const buildEntry = (
  overrides: Partial<EmailOutboxEntity> = {},
): EmailOutboxEntity =>
  Object.assign(new EmailOutboxEntity(), {
    id: "outbox-id",
    templateKey: EmailTemplateKey.PASSWORD_RESET,
    recipient: "maria@orfanatonib.test",
    subject: "Assunto",
    html: "<p>corpo</p>",
    text: "corpo",
    status: EmailOutboxStatus.PENDING,
    attempts: 0,
    scheduledFor: new Date(),
    sentAt: null,
    lastError: null,
    dedupeKey: null,
    ...overrides,
  });

describe("EmailOutboxWorker", () => {
  const outbox = {
    findDue: jest.fn(),
    markSent: jest.fn(),
    markAttemptFailed: jest.fn(),
  };
  const emailService = { dispatch: jest.fn() };

  let worker: EmailOutboxWorker;

  beforeEach(async () => {
    jest.clearAllMocks();

    const moduleRef = await Test.createTestingModule({
      providers: [
        EmailOutboxWorker,
        { provide: EmailOutboxService, useValue: outbox },
        { provide: EmailService, useValue: emailService },
      ],
    }).compile();
    moduleRef.useLogger(false);

    worker = moduleRef.get(EmailOutboxWorker);

    outbox.findDue.mockResolvedValue([]);
    outbox.markSent.mockResolvedValue(undefined);
    outbox.markAttemptFailed.mockResolvedValue(true);
    emailService.dispatch.mockResolvedValue(undefined);
  });

  it("não chama o SMTP quando não há nada vencido", async () => {
    await worker.drain();

    expect(emailService.dispatch).not.toHaveBeenCalled();
  });

  it("entrega cada e-mail do lote e o marca como enviado", async () => {
    const entries = [
      buildEntry({ id: "a", recipient: "a@test" }),
      buildEntry({ id: "b", recipient: "b@test" }),
    ];
    outbox.findDue.mockResolvedValue(entries);

    await worker.drain();

    expect(emailService.dispatch).toHaveBeenCalledTimes(2);
    expect(emailService.dispatch).toHaveBeenCalledWith({
      to: "a@test",
      subject: "Assunto",
      text: "corpo",
      html: "<p>corpo</p>",
    });
    expect(outbox.markSent).toHaveBeenCalledTimes(2);
  });

  it("uma falha não impede os outros e-mails do lote", async () => {
    outbox.findDue.mockResolvedValue([
      buildEntry({ id: "a", recipient: "a@test" }),
      buildEntry({ id: "b", recipient: "b@test" }),
    ]);
    emailService.dispatch
      .mockRejectedValueOnce(new Error("recusado"))
      .mockResolvedValueOnce(undefined);

    await worker.drain();

    expect(outbox.markAttemptFailed).toHaveBeenCalledWith(
      expect.objectContaining({ id: "a" }),
      "recusado",
    );
    expect(outbox.markSent).toHaveBeenCalledTimes(1);
  });

  it("uma falha ao ler a fila não derruba o agendador", async () => {
    outbox.findDue.mockRejectedValue(new Error("banco fora do ar"));

    await expect(worker.drain()).resolves.toBeUndefined();
  });

  it("não deixa duas passadas se sobreporem", async () => {
    let release: () => void = () => undefined;
    outbox.findDue.mockImplementation(
      () =>
        new Promise((resolve) => {
          release = () => resolve([]);
        }),
    );

    const first = worker.drain();
    await worker.drain();

    expect(outbox.findDue).toHaveBeenCalledTimes(1);

    release();
    await first;
  });

  it("volta a processar depois que a passada anterior termina", async () => {
    await worker.drain();
    await worker.drain();

    expect(outbox.findDue).toHaveBeenCalledTimes(2);
  });
});
