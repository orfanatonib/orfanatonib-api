import { Injectable, Logger } from "@nestjs/common";
import { NotificationService } from "src/communication/notification/services/notification.service";
import { PendingWorkRepository } from "../repositories/pending-work.repository";
import {
  REMINDER_GRACE_DAYS,
  REMINDER_LOOKBACK_DAYS,
  ReminderLogs,
  visitReportDedupeKey,
} from "../constants";

const isoDay = (date: Date): string => date.toISOString().slice(0, 10);
const daysAgo = (days: number): Date =>
  new Date(Date.now() - days * 24 * 60 * 60 * 1000);

@Injectable()
export class VisitReportReminderService {
  private readonly logger = new Logger(VisitReportReminderService.name);

  constructor(
    private readonly pendingWork: PendingWorkRepository,
    private readonly notificationService: NotificationService,
  ) {}

  /** Cobra o relatório de cada visita passada que ainda não tem um. */
  async run(): Promise<number> {
    this.logger.log(ReminderLogs.VISIT_REPORT_START);

    const pending = await this.pendingWork.findVisitsWithoutReport(
      isoDay(daysAgo(REMINDER_GRACE_DAYS)),
      isoDay(daysAgo(REMINDER_LOOKBACK_DAYS)),
    );

    for (const visit of pending) {
      const leaders = await this.pendingWork.findTeamLeaders(visit.teamId);

      for (const leader of leaders) {
        await this.notificationService.sendVisitReportReminder(
          leader.email,
          {
            userName: leader.name,
            shelterName: visit.shelterName,
            referenceLabel: `a visita ${visit.visitNumber}, de ${this.formatDate(visit.visitDate)}`,
          },
          // Sem a chave, o agendador cobraria a mesma visita todo dia.
          { dedupeKey: visitReportDedupeKey(visit.scheduleId, leader.email) },
        );
      }
    }

    this.logger.log(ReminderLogs.VISIT_REPORT_DONE(pending.length));
    return pending.length;
  }

  private formatDate(value: string): string {
    const date = new Date(value);
    return Number.isNaN(date.getTime())
      ? value
      : date.toLocaleDateString("pt-BR");
  }
}
