import { Injectable } from "@nestjs/common";
import { UnauthenticatedException } from "src/common/exceptions";
import { GetOneProfileService } from "src/core/profile/services/profile/get-one-profile.service";
import { GetUsersService } from "src/core/user/services/get-user.service";
import { MediaItemProcessor } from "src/shared/media/media-item-processor";
import {
  AUTH_USER_MEDIA_TARGET,
  AuthErrorMessages,
} from "../constants/auth.constants";
import { MeResponseDto } from "../dto/me-response.dto";
import { toMeDto } from "../mappers/me.mapper";

@Injectable()
export class GetMeService {
  constructor(
    private readonly getUsersService: GetUsersService,
    private readonly getOneProfileService: GetOneProfileService,
    private readonly mediaItemProcessor: MediaItemProcessor,
  ) {}

  async execute(userId: string): Promise<MeResponseDto> {
    const user = await this.getUsersService.findWithProfiles(userId);
    if (!user) {
      throw new UnauthenticatedException(AuthErrorMessages.USER_NOT_FOUND);
    }

    // Dados pessoais e preferências pertencem ao módulo de perfil: o contrato
    // dele já devolve exatamente esta forma, inclusive a data normalizada.
    const [image, profile] = await Promise.all([
      this.mediaItemProcessor.findMediaItemByTarget(
        userId,
        AUTH_USER_MEDIA_TARGET,
      ),
      this.getOneProfileService.execute(userId),
    ]);

    return toMeDto(user, {
      image,
      personalData: profile.personalData,
      preferences: profile.preferences,
    });
  }
}
