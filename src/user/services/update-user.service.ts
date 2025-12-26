import {
  Injectable,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';

import { UserRepository } from '../user.repository';
import { UpdateUserDto } from '../dto/update-user.dto';
import { UserEntity } from '../user.entity';

import { TeacherProfilesService } from 'src/modules/teacher-profiles/services/teacher-profiles.service';
import { LeaderProfilesService } from 'src/modules/leader-profiles/services/leader-profiles.service';
import { UserRole } from 'src/auth/auth.types';

@Injectable()
export class UpdateUserService {
  private readonly logger = new Logger(UpdateUserService.name);

  constructor(
    private readonly userRepo: UserRepository,
    private readonly teacherService: TeacherProfilesService,
    private readonly leaderService: LeaderProfilesService,
  ) { }

  async update(id: string, dto: Partial<UpdateUserDto>): Promise<UserEntity> {
    const current = await this.userRepo.findById(id);
    if (!current) throw new NotFoundException('UserEntity not found');

    if (dto.password) {
      dto.password = await bcrypt.hash(dto.password, 10);
    }

    const nextRole: UserRole = (dto.role ?? current.role) as UserRole;
    const activeInDto = typeof dto.active === 'boolean';
    const nextActive: boolean = (dto.active ?? current.active) as boolean;

    const willChangeRole = dto.role !== undefined && dto.role !== current.role;

    if (willChangeRole) {

      if (nextRole === UserRole.TEACHER) {
        await this.leaderService.removeByUserId(id);
        if (nextActive) {
          try {
            await this.teacherService.createForUser(id);
          } catch {
          }
        } else {
          await this.teacherService.removeByUserId(id);
        }
      } else if (nextRole === UserRole.COORDINATOR) {
        await this.teacherService.removeByUserId(id);
        if (nextActive) {
          try {
            await this.leaderService.createForUser(id);
          } catch {
          }
        } else {
          await this.leaderService.removeByUserId(id);
        }
      } else {
        await this.teacherService.removeByUserId(id);
        await this.leaderService.removeByUserId(id);
      }
    }

    if (!willChangeRole && activeInDto) {
      if (nextRole === UserRole.TEACHER) {
        if (nextActive) {
          try {
            await this.teacherService.createForUser(id);
          } catch {
          }
        } else {
          await this.teacherService.removeByUserId(id);
        }
      } else if (nextRole === UserRole.COORDINATOR) {
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
    return user;
  }
}
