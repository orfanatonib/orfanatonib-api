import { Injectable } from "@nestjs/common";
import { MemberProfilesRepository } from "../repositories/member-profiles.repository";
import { MemberProfileEntity } from "../entities/member-profile.entity/member-profile.entity";

@Injectable()
export class CreateMemberProfileService {
  constructor(private readonly repo: MemberProfilesRepository) {}

  async createForUser(userId: string): Promise<MemberProfileEntity> {
    return this.repo.createForUser(userId);
  }
}
