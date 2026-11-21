import { Injectable, NotFoundException, Logger } from "@nestjs/common";
import * as bcrypt from "bcryptjs";

import { UserRepository } from "../user.repository";
import { UpdateUserDto } from "../dto/update-user.dto";
import { UserEntity } from "../entities/user.entity";

import { CreateMemberProfileService } from "src/shelter/member-profile/services/create-member-profile.service";
import { DeleteMemberProfileService } from "src/shelter/member-profile/services/delete-member-profile.service";
import { CreateLeaderProfileService } from "src/shelter/leader-profile/services/create-leader-profile.service";
import { DeleteLeaderProfileService } from "src/shelter/leader-profile/services/delete-leader-profile.service";
import { UserRole } from "src/core/auth/auth.types";
import { RuleException } from "src/common/exceptions";
import { UserErrorMessages, UserLogs } from "../constants/user.constants";
import { NotificationService } from "src/communication/notification/services/notification.service";

@Injectable()
export class UpdateUserService {
  private readonly logger = new Logger(UpdateUserService.name);

  constructor(
    private readonly userRepo: UserRepository,
    private readonly createMemberService: CreateMemberProfileService,
    private readonly deleteMemberService: DeleteMemberProfileService,
    private readonly createLeaderService: CreateLeaderProfileService,
    private readonly deleteLeaderService: DeleteLeaderProfileService,
    private readonly notificationService: NotificationService,
  ) {}

  async markEmailVerified(id: string, verifiedAt: Date): Promise<void> {
    await this.userRepo.update(id, { emailVerifiedAt: verifiedAt });
  }

  async setRefreshToken(id: string, token: string | null): Promise<void> {
    await this.userRepo.updateRefreshToken(id, token);
  }

  async update(id: string, dto: Partial<UpdateUserDto>): Promise<UserEntity> {
    const current = await this.userRepo.findById(id);
    if (!current) throw new NotFoundException(UserErrorMessages.NOT_FOUND);

    // Promover a admin só direto no banco; manter um admin como admin segue valendo.
    if (dto.role === UserRole.ADMIN && current.role !== UserRole.ADMIN) {
      throw new RuleException(UserErrorMessages.ADMIN_GRANT_FORBIDDEN);
    }

    if (dto.password) {
      dto.password = await bcrypt.hash(dto.password, 10);
    }

    const nextRole: UserRole = dto.role ?? current.role;
    const activeInDto = typeof dto.active === "boolean";
    const nextActive: boolean = dto.active ?? current.active;

    const willChangeRole = dto.role !== undefined && dto.role !== current.role;

    if (willChangeRole) {
      if (nextRole === UserRole.MEMBER) {
        await this.deleteLeaderService.removeByUserId(id);
        if (nextActive) {
          // Idempotente (devolve o perfil existente); qualquer outra falha PROPAGA — antes
          // era engolida e o usuário ficava com o papel novo e sem perfil.
          await this.createMemberService.createForUser(id);
        } else {
          await this.deleteMemberService.removeByUserId(id);
        }
      } else if (nextRole === UserRole.LEADER) {
        await this.deleteMemberService.removeByUserId(id);
        if (nextActive) {
          // Idempotente (devolve o perfil existente); qualquer outra falha PROPAGA — antes
          // era engolida e o usuário ficava com o papel novo e sem perfil.
          await this.createLeaderService.createForUser(id);
        } else {
          await this.deleteLeaderService.removeByUserId(id);
        }
      } else {
        await this.deleteMemberService.removeByUserId(id);
        await this.deleteLeaderService.removeByUserId(id);
      }
    }

    if (!willChangeRole && activeInDto) {
      if (nextRole === UserRole.MEMBER) {
        if (nextActive) {
          // Idempotente (devolve o perfil existente); qualquer outra falha PROPAGA — antes
          // era engolida e o usuário ficava com o papel novo e sem perfil.
          await this.createMemberService.createForUser(id);
        } else {
          await this.deleteMemberService.removeByUserId(id);
        }
      } else if (nextRole === UserRole.LEADER) {
        if (nextActive) {
          // Idempotente (devolve o perfil existente); qualquer outra falha PROPAGA — antes
          // era engolida e o usuário ficava com o papel novo e sem perfil.
          await this.createLeaderService.createForUser(id);
        } else {
          await this.deleteLeaderService.removeByUserId(id);
        }
      }
    }
    const user = await this.userRepo.update(id, dto);
    this.logger.log(UserLogs.UPDATED(id));

    if (activeInDto && nextActive && !current.active) {
      await this.notifyAccountApproved(user);
    }

    return user;
  }

  private async notifyAccountApproved(user: UserEntity): Promise<void> {
    try {
      await this.notificationService.sendAccountApproved(user.email, user.name);
    } catch (error: unknown) {
      const reason = error instanceof Error ? error.message : String(error);
      this.logger.warn(
        `Failed to queue account approved email for ${user.id}: ${reason}`,
      );
    }
  }
}
