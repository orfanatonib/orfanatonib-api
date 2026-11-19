import { Injectable, Logger, Optional } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { AuditOutcome } from "src/core/audit/enums";
import { ActionBoundaryService } from "src/core/audit/services/action-boundary.service";
import { runAuditedJob } from "src/core/audit/utils/audited-job.utils";
import { REMINDER_CONFIG } from "src/communication/notification/constants/notification.constants";
import { ReminderLogs } from "./constants";
import { PagelaReminderService } from "./services/pagela-reminder.service";
import { VisitReportReminderService } from "./services/visit-report-reminder.service";

/**
 * Uma passada por dia, de manhã. A deduplicação do outbox é o que garante que
 * rodar todo dia não vira uma cobrança diária pela mesma pendência.
 */
@Injectable()
export class RemindersScheduler {
  private readonly logger = new Logger(RemindersScheduler.name);

  constructor(
    private readonly visitReportReminders: VisitReportReminderService,
    private readonly pagelaReminders: PagelaReminderService,
    @Optional() private readonly boundary?: ActionBoundaryService,
  ) {}

  @Cron(`0 0 ${REMINDER_CONFIG.CRON_HOUR} * * *`, { name: "daily-reminders" })
  async runDaily(): Promise<void> {
    await runAuditedJob(
      this.boundary,
      "daily-reminders",
      async () => {
        const visit = await this.safely("relatórios de visita", () =>
          this.visitReportReminders.run(),
        );
        const pagelas = await this.safely("pagelas", () =>
          this.pagelaReminders.run(),
        );
        return visit && pagelas;
      },
      (ok) => (ok ? AuditOutcome.Succeeded : AuditOutcome.Failed),
    );
  }

  /** Uma falha num lembrete não pode impedir o outro de rodar. */
  private async safely(
    kind: string,
    work: () => Promise<number>,
  ): Promise<boolean> {
    try {
      await work();
      return true;
    } catch (error: unknown) {
      const reason = error instanceof Error ? error.message : String(error);
      this.logger.error(ReminderLogs.FAILED(kind, reason));
      return false;
    }
  }
}
