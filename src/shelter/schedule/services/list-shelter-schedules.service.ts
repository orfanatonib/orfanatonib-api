import { Injectable, Logger } from "@nestjs/common";
import { Request } from "express";
import { ShelterScheduleRepository } from "../shelter-schedule.repository";
import { ShelterScheduleEntity } from "../entities/shelter-schedule.entity";
import { AuthContextService } from "src/core/auth/services/auth-context.service";
import { PaginatedResponseDto } from "src/shared/dto/paginated-response.dto";
import {
  isPaginated,
  toPaginated,
} from "src/shared/list-query/list-query.util";
import {
  QueryShelterScheduleDto,
  ScheduleSortBy,
  usesListFeatures,
} from "../dto/query-shelter-schedule.dto";
import { ShelterScheduleResponseDto } from "../dto/shelter-schedule-response.dto";
import type { ScheduleScope } from "../shelter-schedule.repository";

@Injectable()
export class ListShelterSchedulesService {
  private readonly logger = new Logger(ListShelterSchedulesService.name);

  constructor(
    private readonly scheduleRepo: ShelterScheduleRepository,
    private readonly authCtx: AuthContextService,
  ) {}

  /**
   * Lista filtrada, ordenada e paginada no banco. Sem `page` devolve o array; com `page`,
   * `{ data, meta }`. O escopo do papel vale antes de qualquer filtro.
   */
  async executeQuery(
    req: Request,
    query: QueryShelterScheduleDto,
  ): Promise<
    | ShelterScheduleResponseDto[]
    | PaginatedResponseDto<ShelterScheduleResponseDto>
  > {
    if (!usesListFeatures(query)) {
      const schedules = await this.execute(req, query.teamId);
      return schedules.map((schedule) =>
        ShelterScheduleResponseDto.fromEntity(schedule),
      );
    }

    const payload = await this.authCtx.tryGetPayload(req);
    const { items, total } = await this.scheduleRepo.findFiltered(
      this.scopeOf(payload?.role?.toLowerCase(), payload?.sub),
      query,
    );
    const data = items.map((schedule) =>
      ShelterScheduleResponseDto.fromEntity(schedule),
    );
    if (isPaginated(query)) {
      return toPaginated(
        data,
        query,
        total,
        query.sortBy ?? ScheduleSortBy.EVENT_DATE,
      );
    }
    return data;
  }

  private scopeOf(
    role: string | undefined,
    userId: string | undefined,
  ): ScheduleScope {
    if (role === "admin") return { kind: "all" };
    if (role === "leader" && userId) return { kind: "leader", userId };
    if (role === "member" && userId) return { kind: "member", userId };
    return { kind: "none" };
  }

  async execute(
    req: Request,
    teamIdParam?: string,
  ): Promise<ShelterScheduleEntity[]> {
    this.logger.log("Listing shelter schedules");

    const payload = await this.authCtx.tryGetPayload(req);
    const role = payload?.role?.toLowerCase();
    const userId = payload?.sub;

    const teamId = teamIdParam || (req.query?.teamId as string) || null;

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
