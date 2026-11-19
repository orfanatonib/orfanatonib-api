import { Injectable, Logger } from "@nestjs/common";
import { Request } from "express";
import { ShelterScheduleRepository } from "../shelter-schedule.repository";
import { ShelterScheduleEntity } from "../entities/shelter-schedule.entity";
import { AuthContextService } from "src/core/auth/services/auth-context.service";

@Injectable()
export class ListShelterSchedulesService {
  private readonly logger = new Logger(ListShelterSchedulesService.name);

  constructor(
    private readonly scheduleRepo: ShelterScheduleRepository,
    private readonly authCtx: AuthContextService,
  ) {}

  async execute(req: Request): Promise<ShelterScheduleEntity[]> {
    this.logger.log("Listing shelter schedules");

    const payload = await this.authCtx.tryGetPayload(req);
    const role = payload?.role?.toLowerCase();
    const userId = payload?.sub;

    const teamId = (req.query?.teamId as string) || null;

    // O escopo do papel vem PRIMEIRO; `teamId` só estreita o que o ator já pode
    // ler. Antes, `?teamId=` respondia antes da checagem e qualquer autenticado
    // (inclusive membro) lia a agenda de qualquer equipe.
    const visible = await this.visibleTo(role, userId);
    if (!teamId) return visible;

    this.logger.log(`Filtering schedules by teamId: ${teamId}`);
    return visible.filter((schedule) => schedule.team?.id === teamId);
  }

  private async visibleTo(
    role: string | undefined,
    userId: string | undefined,
  ): Promise<ShelterScheduleEntity[]> {
    if (role === "admin") return this.scheduleRepo.findAll();
    if (role === "leader" && userId) {
      return this.scheduleRepo.findByLeaderId(userId);
    }
    if (role === "member" && userId) {
      return this.scheduleRepo.findByMemberId(userId);
    }
    return [];
  }
}
