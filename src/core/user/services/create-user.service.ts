import {
  Injectable,
  Logger,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';

import { UserRepository } from '../user.repository';
import { CreateUserDto } from '../dto/create-user.dto';
import { UserEntity } from '../entities/user.entity';

import { UserRole } from 'src/core/auth/auth.types';
import { MemberProfilesService } from 'src/shelter/member-profile/services/member-profiles.service';
import { LeaderProfilesService } from 'src/shelter/leader-profile/services/leader-profiles.service';
import { UserLogs } from '../constants/user.constants';

@Injectable()
export class CreateUserService {
  private readonly logger = new Logger(CreateUserService.name);

  constructor(
    private readonly userRepo: UserRepository,
    private readonly memberService: MemberProfilesService,
    private readonly leaderService: LeaderProfilesService,
  ) { }

  async create(dto: CreateUserDto): Promise<UserEntity> {
    const hashedPassword = await bcrypt.hash(dto.password, 10);
    const user = await this.userRepo.create({
      email: dto.email,
      password: hashedPassword,
      name: dto.name,
      phone: dto.phone,
      role: dto.role,
      active: dto.active,
      completed: dto.completed,
      commonUser: dto.commonUser,
    });

    if (user.role === UserRole.LEADER) {
      await this.leaderService.createForUser(user.id);
    } else if (user.role === UserRole.MEMBER) {
      await this.memberService.createForUser(user.id);
    }

    this.logger.log(UserLogs.CREATED(user.id));
    return user;
  }
}
