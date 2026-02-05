import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AttendanceEntity } from './entities/attendance.entity';

import { AttendanceController } from './attendance.controller';
import { ShelterScheduleEntity } from 'src/shelter/schedule/entities/shelter-schedule.entity';
import { TeamEntity } from 'src/shelter/team/entities/team.entity';
import { UserEntity } from 'src/core/user/entities/user.entity';
import { VisitReportEntity } from 'src/shelter/visit-report/entities/visit-report.entity';
import { AuthModule } from 'src/core/auth/auth.module';

import { AttendanceAccessService } from './services/attendance-access.service';
import { AttendanceReaderService } from './services/attendance-reader.service';
import { AttendanceWriterService } from './services/attendance-writer.service';

@Module({
  imports: [
    AuthModule,
    TypeOrmModule.forFeature([
      AttendanceEntity,
      ShelterScheduleEntity,
      TeamEntity,
      UserEntity,
      VisitReportEntity
    ])
  ],
  providers: [
    AttendanceAccessService,
    AttendanceReaderService,
    AttendanceWriterService
  ],
  controllers: [AttendanceController],
  exports: [
    AttendanceReaderService,
    AttendanceWriterService
  ],
})
export class AttendanceModule { }
