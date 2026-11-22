import { Injectable } from "@nestjs/common";
import { TeamsRepository } from "../repositories/teams.repository";
import { UpdateTeamDto } from "../dto/update-team.dto";
import { TeamResponseDto } from "../dto/team-response.dto";
import { GetTeamsService } from "./get-teams.service";
import type { ShelterAccessContext } from "src/shelter/shelter/types";
import { UserRole } from "src/core/auth/auth.types";
import {
  assertCanAttemptTeamWrite,
  assertCanManageTeamsIn,
} from "../utils/team-access.util";

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

  /** Entrada HTTP: só admin, ou líder do abrigo da equipe (404 se não existe). */
  async executeAs(
    actor: ShelterAccessContext,
    id: string,
    dto: UpdateTeamDto,
  ): Promise<TeamResponseDto> {
    assertCanAttemptTeamWrite(actor);
    const team = await this.getTeamsService.findOne(id);
    const led =
      actor.role === UserRole.LEADER && actor.userId
        ? await this.getTeamsService.findLedShelterIds(actor.userId)
        : new Set<string>();
    assertCanManageTeamsIn(actor, team.shelterId, led);
    return this.execute(id, dto);
  }

  /** Troca as equipes do líder numa transação só (ver `TeamsRepository.replaceLeaderTeams`). */
  replaceLeaderTeams(
    leaderId: string,
    assignments: ReadonlyArray<{ shelterId: string; teams: number[] }>,
  ): Promise<void> {
    return this.repository.replaceLeaderTeams(leaderId, assignments);
  }

  /** Move o membro para a equipe do abrigo numa transação só (ver `TeamsRepository.assignMemberToTeam`). */
  assignMemberToTeam(
    memberId: string,
    shelterId: string,
    numberTeam: number,
  ): Promise<{ teamId: string; changed: boolean }> {
    return this.repository.assignMemberToTeam(memberId, shelterId, numberTeam);
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
