import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { VisitReportRepository } from "../visit-report.repository";
import type { ShelterAccessContext } from "src/shelter/shelter/types";
import { canAccessReport } from "../utils/visit-report-access.util";

@Injectable()
export class DeleteVisitReportService {
  private readonly logger = new Logger(DeleteVisitReportService.name);

  constructor(private readonly visitReportRepo: VisitReportRepository) {}

  async execute(id: string, actor: ShelterAccessContext): Promise<void> {
    this.logger.log(`Deleting visit report ${id}`);

    const report = await this.visitReportRepo.findById(id);
    if (!report || !canAccessReport(actor, report)) {
      throw new NotFoundException(`Visit report with ID ${id} not found`);
    }

    await this.visitReportRepo.remove(id);
    this.logger.log(`Visit report ${id} deleted successfully`);
  }
}
