import { Injectable } from "@nestjs/common";
import { TeamsRepository } from "../repositories/teams.repository";

@Injectable()
export class DeleteTeamService {
  constructor(private readonly repository: TeamsRepository) {}

  async execute(id: string): Promise<void> {
    await this.repository.remove(id);
  }

  async removeLeaderFromAllTeams(leaderId: string): Promise<void> {
    return this.repository.removeLeaderFromAllTeams(leaderId);
  }
}
