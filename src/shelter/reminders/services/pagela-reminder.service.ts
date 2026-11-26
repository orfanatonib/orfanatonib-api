import { Injectable, Logger } from "@nestjs/common";
import { NotificationService } from "src/communication/notification/services/notification.service";
import { PendingWorkRepository } from "../repositories/pending-work.repository";
import {
  REMINDER_GRACE_DAYS,
  ReminderLogs,
  pagelaDedupeKey,
} from "../constants";

const isoDay = (date: Date): string => date.toISOString().slice(0, 10);

@Injectable()
export class PagelaReminderService {
  private readonly logger = new Logger(PagelaReminderService.name);

  constructor(
    private readonly pendingWork: PendingWorkRepository,
    private readonly notificationService: NotificationService,
  ) {}

  /** Cobra o lançamento das pagelas da visita mais recente já realizada. */
  async run(): Promise<number> {
    this.logger.log(ReminderLogs.PAGELA_START);

    const dueBefore = isoDay(
      new Date(Date.now() - REMINDER_GRACE_DAYS * 24 * 60 * 60 * 1000),
    );
    const latest = await this.pendingWork.findLatestPastVisit(dueBefore);
    if (!latest) {
      this.logger.log(ReminderLogs.PAGELA_DONE(0));
      return 0;
    }

    // Nenhuma pagela lançada ainda pode significar que a visita não ocorreu;
    // cobrar aí seria ruído.
    if (!(await this.pendingWork.hasAnyPagela(latest.year, latest.visit))) {
      this.logger.log(ReminderLogs.PAGELA_DONE(0));
      return 0;
    }

    const groups = await this.pendingWork.findShelteredWithoutPagela(
      latest.year,
      latest.visit,
    );

    let failures = 0;
    for (const group of groups) {
      if (group.pendingCount === 0) continue;

      const leaders = await this.pendingWork.findTeamLeaders(group.teamId);
      for (const leader of leaders) {
        try {
          await this.notificationService.sendPagelaReminder(
            leader.email,
            {
              userName: leader.name,
              shelterName: group.shelterName,
              referenceLabel: `a visita ${group.visit} de ${group.year}`,
              pendingCount: group.pendingCount,
            },
            {
              dedupeKey: pagelaDedupeKey(
                group.shelterId,
                group.year,
                group.visit,
                leader.email,
              ),
            },
          );
        } catch (error: unknown) {
          // Um destinatário com problema não pode impedir os demais de serem avisados.
          failures += 1;
          this.logger.error(
            ReminderLogs.RECIPIENT_FAILED(
              leader.email,
              error instanceof Error ? error.message : String(error),
            ),
          );
        }
      }
    }

    this.logger.log(ReminderLogs.PAGELA_DONE(groups.length));
    if (failures > 0) throw new Error(ReminderLogs.SOME_FAILED(failures));
    return groups.length;
  }
}
