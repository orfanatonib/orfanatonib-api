import { Injectable } from "@nestjs/common";
import { MemberProfilesRepository } from "../repositories/member-profiles.repository";

@Injectable()
export class DeleteMemberProfileService {
  constructor(private readonly repo: MemberProfilesRepository) {}

  async removeByUserId(userId: string): Promise<void> {
    return this.repo.removeByUserId(userId);
  }
}
