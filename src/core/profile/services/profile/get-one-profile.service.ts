import { Injectable, NotFoundException } from "@nestjs/common";
import { UserRepository } from "../../../user/user.repository";
import { PersonalDataRepository } from "../../repositories/personal-data.repository";
import { UserPreferencesRepository } from "../../repositories/user-preferences.repository";
import { CompleteProfileResponseDto } from "../../dto/complete-profile-response.dto";
import { toCompleteProfileResponse } from "../../mappers/complete-profile.mapper";
import { UserErrorMessages } from "../../../user/constants/user.constants";

@Injectable()
export class GetOneProfileService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly personalDataRepository: PersonalDataRepository,
    private readonly userPreferencesRepository: UserPreferencesRepository,
  ) {}

  async execute(userId: string): Promise<CompleteProfileResponseDto> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundException(UserErrorMessages.USER_NOT_FOUND);
    }

    const personalData = await this.personalDataRepository.findByUserId(userId);
    const preferences =
      await this.userPreferencesRepository.findByUserId(userId);

    return toCompleteProfileResponse(user, personalData, preferences);
  }
}
