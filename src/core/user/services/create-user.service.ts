import { Injectable, Logger } from "@nestjs/common";
import * as bcrypt from "bcryptjs";

import { UserRepository } from "../user.repository";
import { CreateUserDto } from "../dto/create-user.dto";
import { UserEntity } from "../entities/user.entity";

import { UserRole } from "src/core/auth/auth.types";
import { CreateMemberProfileService } from "src/shelter/member-profile/services/create-member-profile.service";
import { CreateLeaderProfileService } from "src/shelter/leader-profile/services/create-leader-profile.service";
import { UserLogs } from "../constants/user.constants";

@Injectable()
export class CreateUserService {
  private readonly logger = new Logger(CreateUserService.name);

  constructor(
    private readonly userRepo: UserRepository,
    private readonly createMemberService: CreateMemberProfileService,
    private readonly createLeaderService: CreateLeaderProfileService,
  ) {}

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
      await this.createLeaderService.createForUser(user.id);
    } else if (user.role === UserRole.MEMBER) {
      await this.createMemberService.createForUser(user.id);
    }

    this.logger.log(UserLogs.CREATED(user.id));
    return user;
  }
}
