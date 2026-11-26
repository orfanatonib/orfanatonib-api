import { Injectable } from "@nestjs/common";
import { TeamsRepository } from "../repositories/teams.repository";
import { CreateTeamDto } from "../dto/create-team.dto";
import { TeamResponseDto } from "../dto/team-response.dto";
import { GetTeamsService } from "./get-teams.service";
import type { ShelterAccessContext } from "src/shelter/shelter/types";
import { UserRole } from "src/core/auth/auth.types";
import {
  assertCanAttemptTeamWrite,
  assertCanManageTeamsIn,
} from "../utils/team-access.util";

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

  /** Entrada HTTP: aplica o escopo do ator antes de criar. */
  async executeAs(
    actor: ShelterAccessContext,
    dto: CreateTeamDto,
  ): Promise<TeamResponseDto> {
    assertCanAttemptTeamWrite(actor);
    const led =
      actor.role === UserRole.LEADER && actor.userId
        ? await this.getTeamsService.findLedShelterIds(actor.userId)
        : new Set<string>();
    assertCanManageTeamsIn(actor, dto.shelterId, led);
    return this.execute(dto);
  }
}
