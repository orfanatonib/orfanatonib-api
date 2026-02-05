import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { VisitReportRepository } from '../visit-report.repository';
import { CreateVisitReportDto } from '../dto/create-visit-report.dto';
import { VisitReportEntity } from '../entities/visit-report.entity';
import { ShelterScheduleRepository } from 'src/shelter/schedule/shelter-schedule.repository';

@Injectable()
export class CreateVisitReportService {
  private readonly logger = new Logger(CreateVisitReportService.name);

  constructor(
    private readonly visitReportRepo: VisitReportRepository,
    private readonly scheduleRepo: ShelterScheduleRepository,
  ) {}

  async execute(dto: CreateVisitReportDto): Promise<VisitReportEntity> {
    this.logger.log(`Creating visit report for schedule ${dto.scheduleId}`);

    const schedule = await this.scheduleRepo.findById(dto.scheduleId);
    if (!schedule) {
      throw new NotFoundException(
        `Schedule with ID ${dto.scheduleId} not found`,
      );
    }

    const existingReport = await this.visitReportRepo.findByScheduleId(
      dto.scheduleId,
    );
    if (existingReport) {
      throw new ConflictException(
        `A visit report for schedule ${dto.scheduleId} already exists. Use update instead.`,
      );
    }

    const visitReport = await this.visitReportRepo.create({
      teamMembersPresent: dto.teamMembersPresent,
      shelteredHeardMessage: dto.shelteredHeardMessage,
      caretakersHeardMessage: dto.caretakersHeardMessage,
      shelteredDecisions: dto.shelteredDecisions,
      caretakersDecisions: dto.caretakersDecisions,
      observation: dto.observation,
      schedule: { id: dto.scheduleId } as any,
    });

    this.logger.log(`Visit report created with ID ${visitReport.id}`);
    return visitReport;
  }
}
