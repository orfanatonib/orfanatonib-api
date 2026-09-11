import { Injectable, Logger } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
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
  ) {}

  @Cron(`0 0 ${REMINDER_CONFIG.CRON_HOUR} * * *`, { name: "daily-reminders" })
  async runDaily(): Promise<void> {
    await this.safely("relatórios de visita", () =>
      this.visitReportReminders.run(),
    );
    await this.safely("pagelas", () => this.pagelaReminders.run());
  }

  /** Uma falha num lembrete não pode impedir o outro de rodar. */
  private async safely(
    kind: string,
    work: () => Promise<number>,
  ): Promise<void> {
    try {
      await work();
    } catch (error: unknown) {
      const reason = error instanceof Error ? error.message : String(error);
      this.logger.error(ReminderLogs.FAILED(kind, reason));
    }
  }
}
