import { Injectable, NotFoundException } from "@nestjs/common";
import { UserRepository } from "../../../user/user.repository";
import { PersonalDataRepository } from "../../repositories/personal-data.repository";
import { UserPreferencesRepository } from "../../repositories/user-preferences.repository";
import { ProfileWriteRepository } from "../../repositories/profile-write.repository";
import { UpdateCompleteProfileDto } from "../../dto/update-complete-profile.dto";
import { CompleteProfileResponseDto } from "../../dto/complete-profile-response.dto";
import { parseBirthDate } from "../../utils/birth-date.util";
import { toCompleteProfileResponse } from "../../mappers/complete-profile.mapper";
import { UserErrorMessages } from "../../../user/constants/user.constants";

@Injectable()
export class UpdateProfileService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly personalDataRepository: PersonalDataRepository,
    private readonly userPreferencesRepository: UserPreferencesRepository,
    private readonly profileWriteRepository: ProfileWriteRepository,
  ) {}

  /** Grava só as seções enviadas (atômico); as demais voltam como já estão. */
  async execute(
    userId: string,
    dto: UpdateCompleteProfileDto,
  ): Promise<CompleteProfileResponseDto> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundException(UserErrorMessages.USER_NOT_FOUND);
    }

    const saved = await this.profileWriteRepository.saveSections(userId, {
      personalData: dto.personalData && {
        ...dto.personalData,
        birthDate: dto.personalData.birthDate
          ? parseBirthDate(dto.personalData.birthDate)
          : undefined,
      },
      preferences: dto.preferences,
    });

    const personalData =
      saved.personalData ??
      (await this.personalDataRepository.findByUserId(userId));
    const preferences =
      saved.preferences ??
      (await this.userPreferencesRepository.findByUserId(userId));

    return toCompleteProfileResponse(user, personalData, preferences);
  }
}
