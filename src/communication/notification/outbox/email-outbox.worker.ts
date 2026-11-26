import { Injectable, Logger, Optional } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { AuditOutcome } from "src/core/audit/enums";
import { ActionBoundaryService } from "src/core/audit/services/action-boundary.service";
import { runAuditedJob } from "src/core/audit/utils/audited-job.utils";
import { EmailService } from "src/infrastructure/email/services/email.service";
import { EmailOutboxService } from "./email-outbox.service";
import { EmailDispatchService } from "../services/email-dispatch.service";
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
    private readonly dispatcher: EmailDispatchService,
    @Optional() private readonly boundary?: ActionBoundaryService,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE, { name: "email-outbox-drain" })
  async drain(): Promise<void> {
    if (this.running) return;
    this.running = true;

    try {
      const due = await this.outbox.findDue(new Date());
      if (due.length === 0) return;

      this.logger.log(OutboxLogs.BATCH_START(due.length));

      // Só passada com trabalho vira ação auditada (um evento por minuto vazio seria ruído).
      await runAuditedJob(
        this.boundary,
        "email-outbox-drain",
        async () => {
          let failed = 0;
          for (const entry of due) {
            try {
              // A flag é um interruptor imediato: vale também para o que já estava na fila.
              if (!(await this.dispatcher.isEnabled(entry.templateKey))) {
                await this.outbox.markSkipped(entry);
                continue;
              }
              await this.emailService.dispatch({
                to: entry.recipient,
                subject: entry.subject,
                text: entry.text,
                html: entry.html,
              });
              await this.outbox.markSent(entry);
              this.logger.log(OutboxLogs.SENT(entry.id));
            } catch (error: unknown) {
              failed += 1;
              const reason =
                error instanceof Error ? error.message : String(error);
              await this.outbox.markAttemptFailed(entry, reason);
            }
          }
          return failed;
        },
        (failed) => (failed > 0 ? AuditOutcome.Failed : AuditOutcome.Succeeded),
      );
    } catch (error: unknown) {
      // Uma falha ao ler a fila não pode derrubar o agendador.
      const reason = error instanceof Error ? error.message : String(error);
      this.logger.error(`Outbox: falha ao processar a fila — ${reason}`);
    } finally {
      this.running = false;
    }
  }
}
