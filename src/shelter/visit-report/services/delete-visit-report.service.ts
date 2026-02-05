import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { VisitReportRepository } from '../visit-report.repository';

@Injectable()
export class DeleteVisitReportService {
  private readonly logger = new Logger(DeleteVisitReportService.name);

  constructor(private readonly visitReportRepo: VisitReportRepository) {}

  async execute(id: string): Promise<void> {
    this.logger.log(`Deleting visit report ${id}`);

    const report = await this.visitReportRepo.findById(id);
    if (!report) {
      throw new NotFoundException(`Visit report with ID ${id} not found`);
    }

    await this.visitReportRepo.remove(id);
    this.logger.log(`Visit report ${id} deleted successfully`);
  }
}
