import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { UserRepository } from '../user.repository';
import { ChangePasswordDto } from '../dto/change-password.dto';
import { UserErrorMessages, UserSuccessMessages, UserLogs } from '../constants/user.constants';

@Injectable()
export class ChangePasswordService {
  private readonly logger = new Logger(ChangePasswordService.name);

  constructor(private readonly userRepo: UserRepository) { }

  async changePassword(userId: string, dto: ChangePasswordDto): Promise<{ message: string }> {
    const user = await this.userRepo.findById(userId);
    if (!user) {
      throw new NotFoundException(UserErrorMessages.USER_NOT_FOUND);
    }

    if (user.commonUser) {
      if (!dto.currentPassword) {
        throw new BadRequestException(UserErrorMessages.CURRENT_PASSWORD_REQUIRED);
      }

      const isPasswordValid = await bcrypt.compare(dto.currentPassword, user.password);
      if (!isPasswordValid) {
        throw new UnauthorizedException(UserErrorMessages.CURRENT_PASSWORD_INCORRECT);
      }
    }

    if (user.password) {
      const isSamePassword = await bcrypt.compare(dto.newPassword, user.password);
      if (isSamePassword) {
        throw new BadRequestException(UserErrorMessages.NEW_PASSWORD_SAME);
      }
    }

    const hashedNewPassword = await bcrypt.hash(dto.newPassword, 10);

    await this.userRepo.update(userId, { password: hashedNewPassword });

    this.logger.log(UserLogs.PASSWORD_CHANGED(userId));

    return { message: UserSuccessMessages.PASSWORD_CHANGED };
  }
}

