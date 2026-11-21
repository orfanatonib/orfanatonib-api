import { Injectable, NotFoundException } from "@nestjs/common";
import { UserRepository } from "../../../user/user.repository";
import { ProfileWriteRepository } from "../../repositories/profile-write.repository";

@Injectable()
export class DeleteProfileService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly profileWriteRepository: ProfileWriteRepository,
  ) {}

  /** Apaga dados pessoais e preferências juntos (o usuário continua). */
  async execute(userId: string): Promise<void> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundException("User not found");
    }

    await this.profileWriteRepository.deleteSections(userId);
  }
}
