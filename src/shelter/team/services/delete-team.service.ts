import { Injectable } from "@nestjs/common";
import { TeamsRepository } from "../repositories/teams.repository";
import { GetTeamsService } from "./get-teams.service";
import type { ShelterAccessContext } from "src/shelter/shelter/types";
import { UserRole } from "src/core/auth/auth.types";
import {
  assertCanAttemptTeamWrite,
  assertCanManageTeamsIn,
} from "../utils/team-access.util";

@Injectable()
export class DeleteTeamService {
  constructor(
    private readonly repository: TeamsRepository,
    private readonly getTeamsService: GetTeamsService,
  ) {}

  async execute(id: string): Promise<void> {
    await this.repository.remove(id);
  }

  /** Entrada HTTP: só admin, ou líder do abrigo da equipe (404 se não existe). */
  async executeAs(actor: ShelterAccessContext, id: string): Promise<void> {
    assertCanAttemptTeamWrite(actor);
    const team = await this.getTeamsService.findOne(id);
    const led =
      actor.role === UserRole.LEADER && actor.userId
        ? await this.getTeamsService.findLedShelterIds(actor.userId)
        : new Set<string>();
    assertCanManageTeamsIn(actor, team.shelterId, led);
    await this.execute(id);
  }

  async removeLeaderFromAllTeams(leaderId: string): Promise<void> {
    return this.repository.removeLeaderFromAllTeams(leaderId);
  }
}
