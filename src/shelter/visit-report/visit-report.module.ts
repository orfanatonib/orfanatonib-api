import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VisitReportEntity } from './entities/visit-report.entity';
import { VisitReportRepository } from './visit-report.repository';
import { VisitReportController } from './visit-report.controller';
import { CreateVisitReportService } from './services/create-visit-report.service';
import { ListVisitReportsService } from './services/list-visit-reports.service';
import { UpdateVisitReportService } from './services/update-visit-report.service';
import { DeleteVisitReportService } from './services/delete-visit-report.service';
import { AuthModule } from 'src/core/auth/auth.module';
import { ShelterScheduleModule } from 'src/shelter/schedule/shelter-schedule.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([VisitReportEntity]),
    AuthModule,
    ShelterScheduleModule,
  ],
  providers: [
    VisitReportRepository,
    CreateVisitReportService,
    ListVisitReportsService,
    UpdateVisitReportService,
    DeleteVisitReportService,
  ],
  controllers: [VisitReportController],
  exports: [VisitReportRepository],
})
export class VisitReportModule {}
