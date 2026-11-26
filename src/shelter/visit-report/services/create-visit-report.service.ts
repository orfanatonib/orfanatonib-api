import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
} from "@nestjs/common";
import { VisitReportRepository } from "../visit-report.repository";
import { CreateVisitReportDto } from "../dto/create-visit-report.dto";
import { VisitReportEntity } from "../entities/visit-report.entity";
import { UserRole } from "src/core/auth/auth.types";
import type { ShelterAccessContext } from "src/shelter/shelter/types";
import { isDuplicateEntry } from "../utils/duplicate-entry.util";
import { ShelterScheduleRepository } from "src/shelter/schedule/shelter-schedule.repository";

@Injectable()
export class CreateVisitReportService {
  private readonly logger = new Logger(CreateVisitReportService.name);

  constructor(
    private readonly visitReportRepo: VisitReportRepository,
    private readonly scheduleRepo: ShelterScheduleRepository,
  ) {}

  async execute(
    dto: CreateVisitReportDto,
    actor: ShelterAccessContext,
  ): Promise<VisitReportEntity> {
    this.logger.log(`Creating visit report for schedule ${dto.scheduleId}`);

    const schedule = await this.scheduleRepo.findById(dto.scheduleId);
    if (!schedule) {
      throw new NotFoundException(
        `Schedule with ID ${dto.scheduleId} not found`,
      );
    }

    // Líder só cria para a equipe que lidera; fora do escopo é 404 (não revela a agenda).
    if (actor.role !== UserRole.ADMIN) {
      const leads =
        actor.role === UserRole.LEADER &&
        !!actor.userId &&
        !!schedule.team &&
        (await this.visitReportRepo.isLeaderOfTeam(
          actor.userId,
          schedule.team.id,
        ));
      if (!leads) {
        throw new NotFoundException(
          `Schedule with ID ${dto.scheduleId} not found`,
        );
      }
    }

    const existingReport = await this.visitReportRepo.findByScheduleId(
      dto.scheduleId,
    );
    if (existingReport) {
      throw new ConflictException(
        `A visit report for schedule ${dto.scheduleId} already exists. Use update instead.`,
      );
    }

    // Dois envios simultâneos passam pela checagem acima; a unicidade do banco (uma por agenda) decide quem fica.
    let visitReport: VisitReportEntity;
    try {
      visitReport = await this.visitReportRepo.create({
        teamMembersPresent: dto.teamMembersPresent,
        shelteredHeardMessage: dto.shelteredHeardMessage,
        caretakersHeardMessage: dto.caretakersHeardMessage,
        shelteredDecisions: dto.shelteredDecisions,
        caretakersDecisions: dto.caretakersDecisions,
        observation: dto.observation,
        schedule,
      });
    } catch (error) {
      if (isDuplicateEntry(error)) {
        throw new ConflictException(
          `A visit report for schedule ${dto.scheduleId} already exists. Use update instead.`,
        );
      }
      throw error;
    }

    this.logger.log(`Visit report created with ID ${visitReport.id}`);
    return visitReport;
  }
}
