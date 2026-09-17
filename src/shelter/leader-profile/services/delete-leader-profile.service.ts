import { Injectable } from "@nestjs/common";
import { LeaderProfilesRepository } from "../repositories/leader-profiles.repository";

@Injectable()
export class DeleteLeaderProfileService {
  constructor(private readonly repo: LeaderProfilesRepository) {}

  async removeByUserId(userId: string): Promise<void> {
    return this.repo.removeByUserId(userId);
  }
}
