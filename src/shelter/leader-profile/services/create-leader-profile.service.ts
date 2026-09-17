import { Injectable } from "@nestjs/common";
import { LeaderProfilesRepository } from "../repositories/leader-profiles.repository";
import { LeaderProfileEntity } from "../entities/leader-profile.entity/leader-profile.entity";

@Injectable()
export class CreateLeaderProfileService {
  constructor(private readonly repo: LeaderProfilesRepository) {}

  async createForUser(userId: string): Promise<LeaderProfileEntity> {
    return this.repo.createForUser(userId);
  }
}
