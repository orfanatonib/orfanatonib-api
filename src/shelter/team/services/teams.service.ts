import { Injectable } from "@nestjs/common";
import { CreateTeamDto } from "../dto/create-team.dto";
import { UpdateTeamDto } from "../dto/update-team.dto";
import { TeamResponseDto } from "../dto/team-response.dto";
import { TeamEntity } from "../entities/team.entity";

import { GetTeamsService } from "./get-teams.service";
import { CreateTeamService } from "./create-team.service";
import { UpdateTeamService } from "./update-team.service";
import { DeleteTeamService } from "./delete-team.service";

@Injectable()
export class TeamsService {
  constructor(
    private readonly getTeamsService: GetTeamsService,
    private readonly createTeamService: CreateTeamService,
    private readonly updateTeamService: UpdateTeamService,
    private readonly deleteTeamService: DeleteTeamService,
  ) {}

  async create(dto: CreateTeamDto): Promise<TeamResponseDto> {
    return this.createTeamService.execute(dto);
  }

  async findAll(): Promise<TeamResponseDto[]> {
    return this.getTeamsService.findAll();
  }

  async findOne(id: string): Promise<TeamResponseDto> {
    return this.getTeamsService.findOne(id);
  }

  async findByShelter(shelterId: string): Promise<TeamResponseDto[]> {
    return this.getTeamsService.findByShelter(shelterId);
  }

  async findByLeader(userId: string): Promise<TeamResponseDto[]> {
    return this.getTeamsService.findByLeader(userId);
  }

  async findTeamByShelterAndNumber(
    shelterId: string,
    numberTeam: number,
  ): Promise<TeamResponseDto | null> {
    return this.getTeamsService.findTeamByShelterAndNumber(shelterId, numberTeam);
  }

  async addLeadersToTeam(
    teamId: string,
    leaderProfileIds: string[],
  ): Promise<TeamResponseDto> {
    return this.updateTeamService.addLeadersToTeam(teamId, leaderProfileIds);
  }

  async removeLeadersFromTeam(
    teamId: string,
    leaderProfileIds: string[],
  ): Promise<TeamResponseDto> {
    return this.updateTeamService.removeLeadersFromTeam(teamId, leaderProfileIds);
  }

  async removeLeaderFromAllTeams(leaderId: string): Promise<void> {
    return this.deleteTeamService.removeLeaderFromAllTeams(leaderId);
  }

  async update(id: string, dto: UpdateTeamDto): Promise<TeamResponseDto> {
    return this.updateTeamService.execute(id, dto);
  }

  async remove(id: string): Promise<void> {
    return this.deleteTeamService.execute(id);
  }

  async findOneEntity(id: string): Promise<TeamEntity | null> {
    return this.getTeamsService.findOneEntity(id);
  }

  async findByUserContext(
    userId: string,
    role: string,
  ): Promise<TeamResponseDto[]> {
    return this.getTeamsService.findByUserContext(userId, role);
  }
}
