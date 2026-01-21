import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { UserRepository } from '../user.repository';
import { UpdateOwnProfileDto } from '../dto/update-own-profile.dto';
import { UserEntity } from '../entities/user.entity';
import { UserErrorMessages, UserLogs } from '../constants/user.constants';

@Injectable()
export class UpdateOwnProfileService {
  private readonly logger = new Logger(UpdateOwnProfileService.name);

  constructor(private readonly userRepo: UserRepository) { }

  async updateOwnProfile(
    userId: string,
    dto: UpdateOwnProfileDto,
  ): Promise<UserEntity> {
    const currentUser = await this.userRepo.findById(userId);
    if (!currentUser) {
      throw new NotFoundException(UserErrorMessages.USER_NOT_FOUND);
    }

    if (dto.email && dto.email !== currentUser.email) {
      const existingUser = await this.userRepo.findByEmail(dto.email);
      if (existingUser && existingUser.id !== userId) {
        throw new BadRequestException(UserErrorMessages.EMAIL_IN_USE);
      }
    }

    const updateData: Partial<UserEntity> = {};
    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.email !== undefined) updateData.email = dto.email;
    if (dto.phone !== undefined) updateData.phone = dto.phone;

    if (Object.keys(updateData).length === 0) {
      return currentUser;
    }

    const updatedUser = await this.userRepo.update(userId, updateData);

    this.logger.log(UserLogs.PROFILE_UPDATED(userId));

    return updatedUser;
  }
}

