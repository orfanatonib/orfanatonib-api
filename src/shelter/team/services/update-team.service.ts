import { Injectable } from "@nestjs/common";
import { TeamsRepository } from "../repositories/teams.repository";
import { UpdateTeamDto } from "../dto/update-team.dto";
import { TeamResponseDto } from "../dto/team-response.dto";
import { GetTeamsService } from "./get-teams.service";

@Injectable()
export class UpdateTeamService {
  constructor(
    private readonly repository: TeamsRepository,
    private readonly getTeamsService: GetTeamsService,
  ) {}

  async execute(id: string, dto: UpdateTeamDto): Promise<TeamResponseDto> {
    const team = await this.repository.update(id, dto);
    return this.getTeamsService.toDto(team);
  }

  async addLeadersToTeam(
    teamId: string,
    leaderProfileIds: string[],
  ): Promise<TeamResponseDto> {
    const team = await this.repository.addLeadersToTeam(
      teamId,
      leaderProfileIds,
    );
    return this.getTeamsService.toDto(team);
  }

  async removeLeadersFromTeam(
    teamId: string,
    leaderProfileIds: string[],
  ): Promise<TeamResponseDto> {
    const team = await this.repository.removeLeadersFromTeam(
      teamId,
      leaderProfileIds,
    );
    return this.getTeamsService.toDto(team);
  }
}
