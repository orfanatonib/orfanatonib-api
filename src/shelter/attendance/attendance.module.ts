import { Module, forwardRef } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { AuthModule } from "src/core/auth/auth.module";
import { UserEntity } from "src/core/user/entities/user.entity";
import { ShelterScheduleEntity } from "src/shelter/schedule/entities/shelter-schedule.entity";
import { TeamEntity } from "src/shelter/team/entities/team.entity";
import { VisitReportEntity } from "src/shelter/visit-report/entities/visit-report.entity";

import { AttendanceController } from "./attendance.controller";
import { AttendanceEntity } from "./entities/attendance.entity";
import { AttendanceRepository } from "./repositories/attendance.repository";
import { AttendanceScopeService } from "./services/attendance-scope.service";
import { GetPendingsService } from "./services/get-pendings.service";
import { GetRecordsService } from "./services/get-records.service";
import { GetSchedulesService } from "./services/get-schedules.service";
import { GetStatsService } from "./services/get-stats.service";
import { GetTeamsService } from "./services/get-teams.service";
import { RegisterAttendanceService } from "./services/register-attendance.service";

@Module({
  imports: [
    forwardRef(() => AuthModule),
    TypeOrmModule.forFeature([
      AttendanceEntity,
      ShelterScheduleEntity,
      TeamEntity,
      UserEntity,
      VisitReportEntity,
    ]),
  ],
  controllers: [AttendanceController],
  providers: [
    AttendanceRepository,
    AttendanceScopeService,
    RegisterAttendanceService,
    GetPendingsService,
    GetTeamsService,
    GetSchedulesService,
    GetRecordsService,
    GetStatsService,
  ],
  // O repositório não é exportado: outros módulos falam com os serviços.
  exports: [GetPendingsService, GetStatsService],
})
export class AttendanceModule {}
