import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ShelterScheduleEntity } from "src/shelter/schedule/entities/shelter-schedule.entity";
import { PagelaEntity } from "src/shelter/pagela/entities/pagela.entity";
import { ShelteredEntity } from "src/shelter/sheltered/entities/sheltered.entity";
import { LeaderProfileEntity } from "src/shelter/leader-profile/entities/leader-profile.entity/leader-profile.entity";
import { PendingWorkRepository } from "./repositories/pending-work.repository";
import { PagelaReminderService } from "./services/pagela-reminder.service";
import { VisitReportReminderService } from "./services/visit-report-reminder.service";
import { RemindersScheduler } from "./reminders.scheduler";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ShelterScheduleEntity,
      PagelaEntity,
      ShelteredEntity,
      LeaderProfileEntity,
    ]),
  ],
  providers: [
    PendingWorkRepository,
    VisitReportReminderService,
    PagelaReminderService,
    RemindersScheduler,
  ],
  exports: [VisitReportReminderService, PagelaReminderService],
})
export class RemindersModule {}
