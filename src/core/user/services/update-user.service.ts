import {
  Injectable,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';

import { UserRepository } from '../user.repository';
import { UpdateUserDto } from '../dto/update-user.dto';
import { UserEntity } from '../entities/user.entity';

import { MemberProfilesService } from 'src/shelter/member-profile/services/member-profiles.service';
import { LeaderProfilesService } from 'src/shelter/leader-profile/services/leader-profiles.service';
import { UserRole } from 'src/core/auth/auth.types';
import { UserErrorMessages, UserLogs } from '../constants/user.constants';

@Injectable()
export class UpdateUserService {
  private readonly logger = new Logger(UpdateUserService.name);

  constructor(
    private readonly userRepo: UserRepository,
    private readonly memberService: MemberProfilesService,
    private readonly leaderService: LeaderProfilesService,
  ) { }

  async update(id: string, dto: Partial<UpdateUserDto>): Promise<UserEntity> {
    const current = await this.userRepo.findById(id);
    if (!current) throw new NotFoundException(UserErrorMessages.NOT_FOUND);

    if (dto.password) {
      dto.password = await bcrypt.hash(dto.password, 10);
    }

    const nextRole: UserRole = (dto.role ?? current.role) as UserRole;
    const activeInDto = typeof dto.active === 'boolean';
    const nextActive: boolean = (dto.active ?? current.active) as boolean;

    const willChangeRole = dto.role !== undefined && dto.role !== current.role;

    if (willChangeRole) {

      if (nextRole === UserRole.MEMBER) {
        await this.leaderService.removeByUserId(id);
        if (nextActive) {
          try {
            await this.memberService.createForUser(id);
          } catch {
          }
        } else {
          await this.memberService.removeByUserId(id);
        }
      } else if (nextRole === UserRole.LEADER) {
        await this.memberService.removeByUserId(id);
        if (nextActive) {
          try {
            await this.leaderService.createForUser(id);
          } catch {
          }
        } else {
          await this.leaderService.removeByUserId(id);
        }
      } else {
        await this.memberService.removeByUserId(id);
        await this.leaderService.removeByUserId(id);
      }
    }

    if (!willChangeRole && activeInDto) {
      if (nextRole === UserRole.MEMBER) {
        if (nextActive) {
          try {
            await this.memberService.createForUser(id);
          } catch {
          }
        } else {
          await this.memberService.removeByUserId(id);
        }
      } else if (nextRole === UserRole.LEADER) {
        if (nextActive) {
          try {
            await this.leaderService.createForUser(id);
          } catch {
          }
        } else {
          await this.leaderService.removeByUserId(id);
        }
      }
    }
    const user = await this.userRepo.update(id, dto);
    this.logger.log(UserLogs.UPDATED(id));
    return user;
  }
}
