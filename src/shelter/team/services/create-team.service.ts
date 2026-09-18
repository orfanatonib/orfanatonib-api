import { Injectable } from "@nestjs/common";
import { TeamsRepository } from "../repositories/teams.repository";
import { CreateTeamDto } from "../dto/create-team.dto";
import { TeamResponseDto } from "../dto/team-response.dto";
import { GetTeamsService } from "./get-teams.service";

@Injectable()
export class CreateTeamService {
  constructor(
    private readonly repository: TeamsRepository,
    private readonly getTeamsService: GetTeamsService,
  ) {}

  async execute(dto: CreateTeamDto): Promise<TeamResponseDto> {
    const team = await this.repository.create(dto);
    return this.getTeamsService.toDto(team);
  }
}
