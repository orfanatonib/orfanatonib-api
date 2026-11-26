import { Injectable } from "@nestjs/common";
import { AttendanceRepository } from "../repositories/attendance.repository";
import { AttendanceScopeService } from "./attendance-scope.service";
import { AttendanceActor } from "../types";
import { AttendanceFiltersDto } from "../dto/attendance-filters.dto";
import {
  AttendanceRecordListItemDto,
  PaginatedResponseDto,
} from "../dto/attendance-response.dto";
import { toAttendanceResponseDto } from "../mappers/attendance.mapper";
import { toRecordsFilters } from "../utils/attendance-filters.util";

@Injectable()
export class GetRecordsService {
  constructor(
    private readonly repository: AttendanceRepository,
    private readonly scopeService: AttendanceScopeService,
  ) {}

  /** Histórico de lançamentos, restrito às equipes que o ator alcança. */
  async execute(
    actor: AttendanceActor,
    query: AttendanceFiltersDto,
  ): Promise<PaginatedResponseDto<AttendanceRecordListItemDto>> {
    const scope = await this.scopeService.resolve(actor);
    const filters = toRecordsFilters(query);
    const teamIds = this.scopeService.allTeamFilter(scope);

    // Sem equipe alguma não há o que listar — e um `IN ()` vazio quebraria.
    if (teamIds && teamIds.length === 0) {
      return {
        data: [],
        meta: {
          page: filters.page,
          limit: filters.limit,
          total: 0,
          totalPages: 0,
          hasNext: false,
          hasPrev: false,
        },
      };
    }

    const { items, total } = await this.repository.findRecordsPaginated(
      filters,
      teamIds,
    );
    const totalPages = filters.limit > 0 ? Math.ceil(total / filters.limit) : 0;

    return {
      data: items.map(toAttendanceResponseDto),
      meta: {
        page: filters.page,
        limit: filters.limit,
        total,
        totalPages,
        hasNext: filters.page < totalPages,
        hasPrev: filters.page > 1,
      },
    };
  }
}
