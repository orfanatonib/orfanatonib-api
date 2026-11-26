import { Injectable, NotFoundException } from "@nestjs/common";
import { UserRepository } from "../../../user/user.repository";
import { ProfileWriteRepository } from "../../repositories/profile-write.repository";
import { CreateCompleteProfileDto } from "../../dto/create-complete-profile.dto";
import { CompleteProfileResponseDto } from "../../dto/complete-profile-response.dto";
import { parseBirthDate } from "../../utils/birth-date.util";
import { toCompleteProfileResponse } from "../../mappers/complete-profile.mapper";

@Injectable()
export class CreateProfileService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly profileWriteRepository: ProfileWriteRepository,
  ) {}

  /** Cria (ou atualiza, se já existir) as duas seções do próprio perfil, de forma atômica. */
  async execute(
    userId: string,
    dto: CreateCompleteProfileDto,
  ): Promise<CompleteProfileResponseDto> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundException("User not found");
    }

    const { personalData, preferences } =
      await this.profileWriteRepository.saveSections(userId, {
        personalData: dto.personalData && {
          ...dto.personalData,
          birthDate: dto.personalData.birthDate
            ? parseBirthDate(dto.personalData.birthDate)
            : undefined,
        },
        preferences: dto.preferences,
      });

    return toCompleteProfileResponse(user, personalData, preferences);
  }
}
