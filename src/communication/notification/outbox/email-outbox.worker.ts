import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { EmailService } from "src/infrastructure/email/services/email.service";
import { EmailOutboxService } from "./email-outbox.service";
import { OutboxLogs } from "../constants/notification.constants";

/**
 * Tira a fila de saída do caminho do request: a cada minuto pega o lote
 * vencido e tenta entregar. Falha reagenda com backoff; o request que gerou o
 * e-mail já respondeu faz tempo.
 */
@Injectable()
export class EmailOutboxWorker {
  private readonly logger = new Logger(EmailOutboxWorker.name);
  /** Evita que duas passadas se sobreponham num envio lento. */
  private running = false;

  constructor(
    private readonly outbox: EmailOutboxService,
    private readonly emailService: EmailService,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE, { name: "email-outbox-drain" })
  async drain(): Promise<void> {
    if (this.running) return;
    this.running = true;

    try {
      const due = await this.outbox.findDue(new Date());
      if (due.length === 0) return;

      this.logger.log(OutboxLogs.BATCH_START(due.length));

      for (const entry of due) {
        try {
          await this.emailService.dispatch({
            to: entry.recipient,
            subject: entry.subject,
            text: entry.text,
            html: entry.html,
          });
          await this.outbox.markSent(entry);
          this.logger.log(OutboxLogs.SENT(entry.id));
        } catch (error: unknown) {
          const reason = error instanceof Error ? error.message : String(error);
          await this.outbox.markAttemptFailed(entry, reason);
        }
      }
    } catch (error: unknown) {
      // Uma falha ao ler a fila não pode derrubar o agendador.
      const reason = error instanceof Error ? error.message : String(error);
      this.logger.error(`Outbox: falha ao processar a fila — ${reason}`);
    } finally {
      this.running = false;
    }
  }
}
