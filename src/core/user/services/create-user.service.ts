import {
  Injectable,
  Logger,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';

import { UserRepository } from '../user.repository';
import { CreateUserDto } from '../dto/create-user.dto';
import { UserEntity } from '../entities/user.entity';

import { TeacherProfilesService } from 'src/shelter/teacher-profile/services/teacher-profiles.service';
import { LeaderProfilesService } from 'src/shelter/leader-profile/services/leader-profiles.service';
import { UserRole } from 'src/core/auth/auth.types';

@Injectable()
export class CreateUserService {
  private readonly logger = new Logger(CreateUserService.name);

  constructor(
    private readonly userRepo: UserRepository,
    private readonly teacherService: TeacherProfilesService,
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
    } else if (user.role === UserRole.TEACHER) {
      await this.teacherService.createForUser(user.id);
    }
    return user;
  }
}
