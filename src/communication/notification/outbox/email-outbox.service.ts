import { Injectable, Logger } from "@nestjs/common";
import { EmailOutboxEntity } from "./email-outbox.entity";
import { EmailOutboxRepository } from "./email-outbox.repository";
import { EmailOutboxStatus } from "../enums/email-outbox-status.enum";
import { OUTBOX_CONFIG, OutboxLogs } from "../constants/notification.constants";
import { OutboxEnqueueInput } from "../types";

/**
 * A fila de saída. O caso de uso grava aqui e responde; a entrega é do worker.
 *
 * Um e-mail por destinatário, de propósito: assim uma caixa recusada não
 * impede as outras e o histórico mostra exatamente quem recebeu o quê.
 */
@Injectable()
export class EmailOutboxService {
  private readonly logger = new Logger(EmailOutboxService.name);

  constructor(private readonly repository: EmailOutboxRepository) {}

  async enqueue(input: OutboxEnqueueInput): Promise<EmailOutboxEntity[]> {
    const recipients = [
      ...new Set(
        input.recipients.map((email) => email.trim()).filter((email) => email),
      ),
    ];

    if (recipients.length === 0) {
      this.logger.warn(OutboxLogs.NO_RECIPIENTS(input.templateKey));
      return [];
    }

    if (
      input.dedupeKey &&
      (await this.repository.existsByDedupeKey(input.dedupeKey))
    ) {
      this.logger.log(OutboxLogs.DUPLICATE(input.dedupeKey));
      return [];
    }

    const scheduledFor = input.scheduledFor ?? new Date();
    const entries = recipients.map((recipient, index) =>
      this.repository.create({
        templateKey: input.templateKey,
        recipient,
        subject: input.rendered.subject,
        html: input.rendered.html,
        text: input.rendered.text,
        status: EmailOutboxStatus.PENDING,
        attempts: 0,
        scheduledFor,
        sentAt: null,
        lastError: null,
        // A chave só pode existir uma vez: com vários destinatários, ela fica
        // no primeiro e os demais viajam junto no mesmo lote.
        dedupeKey: input.dedupeKey && index === 0 ? input.dedupeKey : null,
      }),
    );

    const saved = await this.repository.save(entries);
    this.logger.log(OutboxLogs.ENQUEUED(input.templateKey, saved.length));
    return saved;
  }

  /** Registra o e-mail que a feature flag barrou, sem enviar. */
  async recordSkipped(input: OutboxEnqueueInput): Promise<void> {
    const recipients = [...new Set(input.recipients.filter((email) => email))];
    if (recipients.length === 0) return;

    const entries = recipients.map((recipient) =>
      this.repository.create({
        templateKey: input.templateKey,
        recipient,
        subject: input.rendered.subject,
        html: input.rendered.html,
        text: input.rendered.text,
        status: EmailOutboxStatus.SKIPPED,
        attempts: 0,
        scheduledFor: new Date(),
        sentAt: null,
        lastError: null,
        dedupeKey: null,
      }),
    );

    await this.repository.save(entries);
    this.logger.log(OutboxLogs.SKIPPED_BY_FLAG(input.templateKey));
  }

  findDue(now: Date): Promise<EmailOutboxEntity[]> {
    return this.repository.findDue(OUTBOX_CONFIG.BATCH_SIZE, now);
  }

  async markSent(entry: EmailOutboxEntity): Promise<void> {
    entry.status = EmailOutboxStatus.SENT;
    entry.attempts += 1;
    entry.sentAt = new Date();
    entry.lastError = null;
    await this.repository.saveOne(entry);
  }

  /**
   * Reagenda com backoff exponencial e desiste depois do teto de tentativas.
   * Devolve `true` quando ainda haverá nova tentativa.
   */
  async markAttemptFailed(
    entry: EmailOutboxEntity,
    reason: string,
  ): Promise<boolean> {
    entry.attempts += 1;
    entry.lastError = reason.slice(0, OUTBOX_CONFIG.ERROR_MAX_LENGTH);

    if (entry.attempts >= OUTBOX_CONFIG.MAX_ATTEMPTS) {
      entry.status = EmailOutboxStatus.FAILED;
      await this.repository.saveOne(entry);
      this.logger.error(OutboxLogs.GAVE_UP(entry.id, entry.attempts));
      return false;
    }

    entry.scheduledFor = new Date(
      Date.now() + this.backoffSeconds(entry.attempts) * 1000,
    );
    await this.repository.saveOne(entry);
    this.logger.warn(OutboxLogs.RETRY(entry.id, entry.attempts));
    return true;
  }

  async requeueFailed(): Promise<number> {
    const count = await this.repository.requeueFailed(new Date());
    this.logger.log(OutboxLogs.REQUEUED(count));
    return count;
  }

  findRecent(limit: number): Promise<EmailOutboxEntity[]> {
    return this.repository.findRecent(limit);
  }

  private backoffSeconds(attempt: number): number {
    const seconds =
      OUTBOX_CONFIG.BACKOFF_BASE_SECONDS * Math.pow(2, attempt - 1);
    return Math.min(seconds, OUTBOX_CONFIG.BACKOFF_MAX_SECONDS);
  }
}
