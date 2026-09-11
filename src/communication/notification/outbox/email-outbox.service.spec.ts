import { Test } from "@nestjs/testing";
import { EmailOutboxService } from "./email-outbox.service";
import { EmailOutboxRepository } from "./email-outbox.repository";
import { EmailOutboxEntity } from "./email-outbox.entity";
import { EmailOutboxStatus } from "../enums/email-outbox-status.enum";
import { EmailTemplateKey } from "../enums/email-template-key.enum";
import { OUTBOX_CONFIG } from "../constants/notification.constants";
import { OutboxEnqueueInput } from "../types";

const rendered = {
  subject: "Assunto",
  html: "<p>corpo</p>",
  text: "corpo",
};

const buildInput = (
  overrides: Partial<OutboxEnqueueInput> = {},
): OutboxEnqueueInput => ({
  templateKey: EmailTemplateKey.PASSWORD_RESET,
  recipients: ["maria@orfanatonib.test"],
  rendered,
  ...overrides,
});

const buildEntry = (
  overrides: Partial<EmailOutboxEntity> = {},
): EmailOutboxEntity =>
  Object.assign(new EmailOutboxEntity(), {
    id: "outbox-id",
    templateKey: EmailTemplateKey.PASSWORD_RESET,
    recipient: "maria@orfanatonib.test",
    subject: rendered.subject,
    html: rendered.html,
    text: rendered.text,
    status: EmailOutboxStatus.PENDING,
    attempts: 0,
    scheduledFor: new Date("2026-09-11T09:00:00.000Z"),
    sentAt: null,
    lastError: null,
    dedupeKey: null,
    ...overrides,
  });

describe("EmailOutboxService", () => {
  const repository = {
    create: jest.fn(),
    save: jest.fn(),
    saveOne: jest.fn(),
    existsByDedupeKey: jest.fn(),
    findDue: jest.fn(),
    findRecent: jest.fn(),
    requeueFailed: jest.fn(),
  };

  let service: EmailOutboxService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const moduleRef = await Test.createTestingModule({
      providers: [
        EmailOutboxService,
        { provide: EmailOutboxRepository, useValue: repository },
      ],
    }).compile();
    moduleRef.useLogger(false);

    service = moduleRef.get(EmailOutboxService);

    repository.create.mockImplementation((data: Partial<EmailOutboxEntity>) =>
      Object.assign(new EmailOutboxEntity(), data),
    );
    repository.save.mockImplementation((entries: EmailOutboxEntity[]) =>
      Promise.resolve(entries),
    );
    repository.saveOne.mockImplementation((entry: EmailOutboxEntity) =>
      Promise.resolve(entry),
    );
    repository.existsByDedupeKey.mockResolvedValue(false);
    repository.requeueFailed.mockResolvedValue(3);
  });

  describe("enqueue", () => {
    it("grava uma linha por destinatário", async () => {
      const saved = await service.enqueue(
        buildInput({ recipients: ["a@test", "b@test"] }),
      );

      expect(saved).toHaveLength(2);
      expect(saved.map((entry) => entry.recipient)).toEqual([
        "a@test",
        "b@test",
      ]);
      expect(
        saved.every((entry) => entry.status === EmailOutboxStatus.PENDING),
      ).toBe(true);
    });

    it("remove duplicatas e espaços dos destinatários", async () => {
      const saved = await service.enqueue(
        buildInput({ recipients: ["  a@test ", "a@test", "b@test"] }),
      );

      expect(saved.map((entry) => entry.recipient)).toEqual([
        "a@test",
        "b@test",
      ]);
    });

    it("não grava nada quando não há destinatário", async () => {
      await expect(
        service.enqueue(buildInput({ recipients: ["", "   "] })),
      ).resolves.toEqual([]);
      expect(repository.save).not.toHaveBeenCalled();
    });

    it("ignora quando a chave de deduplicação já existe", async () => {
      repository.existsByDedupeKey.mockResolvedValue(true);

      await expect(
        service.enqueue(buildInput({ dedupeKey: "lembrete:1" })),
      ).resolves.toEqual([]);
      expect(repository.save).not.toHaveBeenCalled();
    });

    it("guarda a chave só na primeira linha do lote", async () => {
      const saved = await service.enqueue(
        buildInput({
          recipients: ["a@test", "b@test"],
          dedupeKey: "lembrete:1",
        }),
      );

      expect(saved[0].dedupeKey).toBe("lembrete:1");
      expect(saved[1].dedupeKey).toBeNull();
    });

    it("respeita o horário agendado", async () => {
      const scheduledFor = new Date("2027-01-01T12:00:00.000Z");

      const saved = await service.enqueue(buildInput({ scheduledFor }));

      expect(saved[0].scheduledFor).toBe(scheduledFor);
    });
  });

  describe("recordSkipped", () => {
    it("registra o e-mail barrado sem enfileirar para envio", async () => {
      await service.recordSkipped(buildInput());

      const [entries] = repository.save.mock.calls[0] as [EmailOutboxEntity[]];
      expect(entries[0].status).toBe(EmailOutboxStatus.SKIPPED);
      expect(entries[0].dedupeKey).toBeNull();
    });

    it("não grava nada sem destinatário", async () => {
      await service.recordSkipped(buildInput({ recipients: [] }));

      expect(repository.save).not.toHaveBeenCalled();
    });
  });

  describe("markSent", () => {
    it("marca a entrega e limpa o erro anterior", async () => {
      const entry = buildEntry({ attempts: 2, lastError: "timeout" });

      await service.markSent(entry);

      expect(entry.status).toBe(EmailOutboxStatus.SENT);
      expect(entry.attempts).toBe(3);
      expect(entry.sentAt).toBeInstanceOf(Date);
      expect(entry.lastError).toBeNull();
    });
  });

  describe("markAttemptFailed", () => {
    it("reagenda com espera crescente enquanto houver tentativa", async () => {
      const entry = buildEntry({ attempts: 0 });

      await expect(service.markAttemptFailed(entry, "timeout")).resolves.toBe(
        true,
      );

      expect(entry.status).toBe(EmailOutboxStatus.PENDING);
      expect(entry.attempts).toBe(1);
      expect(entry.scheduledFor.getTime()).toBeGreaterThan(Date.now());
      expect(entry.lastError).toBe("timeout");
    });

    it("a espera dobra a cada tentativa, até o teto", async () => {
      const first = buildEntry({ attempts: 0 });
      await service.markAttemptFailed(first, "erro");
      const firstWait = first.scheduledFor.getTime() - Date.now();

      const second = buildEntry({ attempts: 1 });
      await service.markAttemptFailed(second, "erro");
      const secondWait = second.scheduledFor.getTime() - Date.now();

      expect(secondWait).toBeGreaterThan(firstWait);
      expect(secondWait / 1000).toBeLessThanOrEqual(
        OUTBOX_CONFIG.BACKOFF_MAX_SECONDS + 1,
      );
    });

    it("desiste ao atingir o teto de tentativas", async () => {
      const entry = buildEntry({ attempts: OUTBOX_CONFIG.MAX_ATTEMPTS - 1 });

      await expect(service.markAttemptFailed(entry, "recusado")).resolves.toBe(
        false,
      );

      expect(entry.status).toBe(EmailOutboxStatus.FAILED);
      expect(entry.attempts).toBe(OUTBOX_CONFIG.MAX_ATTEMPTS);
    });

    it("corta o erro guardado para caber na coluna", async () => {
      const entry = buildEntry();

      await service.markAttemptFailed(entry, "x".repeat(5000));

      expect(entry.lastError?.length).toBe(OUTBOX_CONFIG.ERROR_MAX_LENGTH);
    });
  });

  it("findDue pede o lote configurado", async () => {
    repository.findDue.mockResolvedValue([]);
    const now = new Date();

    await service.findDue(now);

    expect(repository.findDue).toHaveBeenCalledWith(
      OUTBOX_CONFIG.BATCH_SIZE,
      now,
    );
  });

  it("requeueFailed devolve quantos voltaram à fila", async () => {
    await expect(service.requeueFailed()).resolves.toBe(3);
  });
});
