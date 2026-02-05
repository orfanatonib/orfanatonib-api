import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { VisitReportRepository } from '../visit-report.repository';
import { UpdateVisitReportDto } from '../dto/update-visit-report.dto';
import { VisitReportEntity } from '../entities/visit-report.entity';

@Injectable()
export class UpdateVisitReportService {
  private readonly logger = new Logger(UpdateVisitReportService.name);

  constructor(private readonly visitReportRepo: VisitReportRepository) {}

  async execute(
    id: string,
    dto: UpdateVisitReportDto,
  ): Promise<VisitReportEntity> {
    this.logger.log(`Updating visit report ${id}`);

    const existingReport = await this.visitReportRepo.findById(id);
    if (!existingReport) {
      throw new NotFoundException(`Visit report with ID ${id} not found`);
    }

    const updateData: Partial<VisitReportEntity> = {};

    if (dto.teamMembersPresent !== undefined) {
      updateData.teamMembersPresent = dto.teamMembersPresent;
    }
    if (dto.shelteredHeardMessage !== undefined) {
      updateData.shelteredHeardMessage = dto.shelteredHeardMessage;
    }
    if (dto.caretakersHeardMessage !== undefined) {
      updateData.caretakersHeardMessage = dto.caretakersHeardMessage;
    }
    if (dto.shelteredDecisions !== undefined) {
      updateData.shelteredDecisions = dto.shelteredDecisions;
    }
    if (dto.caretakersDecisions !== undefined) {
      updateData.caretakersDecisions = dto.caretakersDecisions;
    }
    if (dto.observation !== undefined) {
      updateData.observation = dto.observation;
    }

    await this.visitReportRepo.update(id, updateData);

    const updated = await this.visitReportRepo.findById(id);
    if (!updated) {
      throw new NotFoundException(`Failed to retrieve updated visit report`);
    }

    this.logger.log(`Visit report ${id} updated successfully`);
    return updated;
  }
}
