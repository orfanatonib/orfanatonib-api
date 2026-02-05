import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Request } from 'express';
import { VisitReportRepository } from '../visit-report.repository';
import { VisitReportEntity } from '../entities/visit-report.entity';
import { AuthContextService } from 'src/core/auth/services/auth-context.service';

@Injectable()
export class ListVisitReportsService {
  private readonly logger = new Logger(ListVisitReportsService.name);

  constructor(
    private readonly visitReportRepo: VisitReportRepository,
    private readonly authCtx: AuthContextService,
  ) {}

  async execute(req: Request): Promise<VisitReportEntity[]> {
    this.logger.log('Listing visit reports');

    const payload = await this.authCtx.tryGetPayload(req);
    const role = payload?.role?.toLowerCase();
    const userId = payload?.sub;

    const teamId = (req.query?.teamId as string) || null;
    const shelterId = (req.query?.shelterId as string) || null;
    const scheduleId = (req.query?.scheduleId as string) || null;

    if (scheduleId) {
      this.logger.log(`Filtering reports by scheduleId: ${scheduleId}`);
      const report = await this.visitReportRepo.findByScheduleId(scheduleId);
      return report ? [report] : [];
    }

    if (teamId) {
      this.logger.log(`Filtering reports by teamId: ${teamId}`);
      return this.visitReportRepo.findByTeamId(teamId);
    }

    if (shelterId) {
      this.logger.log(`Filtering reports by shelterId: ${shelterId}`);
      return this.visitReportRepo.findByShelterId(shelterId);
    }

    if (role === 'admin') {
      return this.visitReportRepo.findAll();
    }

    if (role === 'leader' && userId) {
      return this.visitReportRepo.findByLeaderId(userId);
    }

    return [];
  }

  async findOne(id: string): Promise<VisitReportEntity> {
    this.logger.log(`Finding visit report by ID: ${id}`);

    const report = await this.visitReportRepo.findById(id);
    if (!report) {
      throw new NotFoundException(`Visit report with ID ${id} not found`);
    }

    return report;
  }
}
