import { Injectable } from "@nestjs/common";
import { ResourceNotFoundException } from "src/common/exceptions";
import { TeamEntity } from "src/shelter/team/entities/team.entity";
import { AttendanceRepository } from "../repositories/attendance.repository";
import { AttendanceScopeService } from "./attendance-scope.service";
import { AttendanceActor } from "../types";
import { ATTENDANCE_MESSAGES } from "../constants";
import { memberUsersOf } from "../mappers/attendance.mapper";
import { PaginatedResponseDto } from "src/shared/dto/paginated-response.dto";
import {
  isPaginated,
  toPaginated,
} from "src/shared/list-query/list-query.util";
import {
  ShelterTeamsQueryDto,
  ShelterTeamsSortBy,
  usesShelterTeamsFeatures,
} from "../dto/shelter-teams-query.dto";
import {
  LeaderTeamDto,
  ShelterTeamsMembersDto,
  TeamMembersDto,
} from "../dto/attendance-response.dto";

@Injectable()
export class GetTeamsService {
  constructor(
    private readonly repository: AttendanceRepository,
    private readonly scopeService: AttendanceScopeService,
  ) {}

  /** Membros de uma equipe, para a tela de lançamento em lote. */
  async listTeamMembers(
    actor: AttendanceActor,
    teamId: string,
  ): Promise<TeamMembersDto> {
    const scope = await this.scopeService.resolve(actor);
    this.scopeService.assertLeads(scope, teamId);

    const team = await this.repository.findTeamWithMembers(teamId);
    if (!team) {
      throw new ResourceNotFoundException(ATTENDANCE_MESSAGES.TEAM_NOT_FOUND);
    }

    return {
      teamId: team.id,
      teamNumber: team.numberTeam,
      shelterName: team.shelter?.name ?? "",
      members: memberUsersOf(team).map((user) => ({
        id: user.id,
        name: user.name,
        email: user.email,
        role: "member",
      })),
    };
  }

  /** Equipes que o ator lidera, em lista plana. */
  async listLeaderTeams(actor: AttendanceActor): Promise<LeaderTeamDto[]> {
    const teams = await this.leaderTeams(actor);

    return teams.map((team) => ({
      teamId: team.id,
      teamNumber: team.numberTeam,
      shelterId: team.shelter?.id ?? "",
      shelterName: team.shelter?.name ?? "",
      description: team.description,
      memberCount: team.members?.length ?? 0,
    }));
  }

  /**
   * As mesmas equipes, agrupadas por abrigo e com os membros. Com filtros (`search`, `shelterId`,
   * `sortBy`, `order`, `page`) o banco filtra/ordena/recorta; com `page` vira `{ data, meta }`.
   */
  async listLeaderTeamsWithMembers(
    actor: AttendanceActor,
    query?: ShelterTeamsQueryDto,
  ): Promise<
    ShelterTeamsMembersDto[] | PaginatedResponseDto<ShelterTeamsMembersDto>
  > {
    if (!query || !usesShelterTeamsFeatures(query)) {
      return this.groupByShelter(await this.leaderTeams(actor));
    }

    const scope = await this.scopeService.resolve(actor);
    const filter = this.scopeService.leaderTeamFilter(scope);
    const { teams, total } =
      filter && filter.length === 0
        ? { teams: [], total: 0 }
        : await this.repository.findShelterPage(filter, query);
    const data = this.groupByShelter(teams);
    if (isPaginated(query)) {
      return toPaginated(
        data,
        query,
        total,
        query.sortBy ?? ShelterTeamsSortBy.SHELTER_NAME,
      );
    }
    return data;
  }

  private groupByShelter(teams: TeamEntity[]): ShelterTeamsMembersDto[] {
    const byShelter = new Map<string, ShelterTeamsMembersDto>();

    for (const team of teams) {
      const shelterId = team.shelter?.id ?? "";
      const shelter = byShelter.get(shelterId) ?? {
        shelterId,
        shelterName: team.shelter?.name ?? "",
        teams: [],
      };

      shelter.teams.push({
        teamId: team.id,
        teamNumber: team.numberTeam,
        description: team.description,
        memberCount: team.members?.length ?? 0,
        members: memberUsersOf(team).map((user) => ({
          id: user.id,
          name: user.name,
          email: user.email,
          role: "member",
        })),
      });

      byShelter.set(shelterId, shelter);
    }

    return [...byShelter.values()];
  }

  /** Admin enxerga todas; líder, só as suas. Sem equipe, lista vazia. */
  private async leaderTeams(actor: AttendanceActor): Promise<TeamEntity[]> {
    const scope = await this.scopeService.resolve(actor);
    const filter = this.scopeService.leaderTeamFilter(scope);

    if (filter && filter.length === 0) return [];
    return this.repository.findTeamsWithMembers(filter);
  }
}
