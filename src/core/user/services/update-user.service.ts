import { Injectable, NotFoundException, Logger } from "@nestjs/common";
import * as bcrypt from "bcryptjs";

import { UserRepository } from "../user.repository";
import { UpdateUserDto } from "../dto/update-user.dto";
import { UserEntity } from "../entities/user.entity";

import { MemberProfilesService } from "src/shelter/member-profile/services/member-profiles.service";
import { LeaderProfilesService } from "src/shelter/leader-profile/services/leader-profiles.service";
import { UserRole } from "src/core/auth/auth.types";
import { UserErrorMessages, UserLogs } from "../constants/user.constants";
import { NotificationService } from "src/communication/notification/services/notification.service";

@Injectable()
export class UpdateUserService {
  private readonly logger = new Logger(UpdateUserService.name);

  constructor(
    private readonly userRepo: UserRepository,
    private readonly memberService: MemberProfilesService,
    private readonly leaderService: LeaderProfilesService,
    private readonly notificationService: NotificationService,
  ) {}

  /** Registra a confirmação do e-mail. Contrato usado por `core/auth`. */
  async markEmailVerified(id: string, verifiedAt: Date): Promise<void> {
    await this.userRepo.update(id, { emailVerifiedAt: verifiedAt });
  }

  /**
   * Troca o refresh token guardado. Passar `null` encerra a sessão: a
   * renovação compara o token recebido com este.
   */
  async setRefreshToken(id: string, token: string | null): Promise<void> {
    await this.userRepo.updateRefreshToken(id, token);
  }

  async update(id: string, dto: Partial<UpdateUserDto>): Promise<UserEntity> {
    const current = await this.userRepo.findById(id);
    if (!current) throw new NotFoundException(UserErrorMessages.NOT_FOUND);

    if (dto.password) {
      dto.password = await bcrypt.hash(dto.password, 10);
    }

    const nextRole: UserRole = dto.role ?? current.role;
    const activeInDto = typeof dto.active === "boolean";
    const nextActive: boolean = dto.active ?? current.active;

    const willChangeRole = dto.role !== undefined && dto.role !== current.role;

    if (willChangeRole) {
      if (nextRole === UserRole.MEMBER) {
        await this.leaderService.removeByUserId(id);
        if (nextActive) {
          try {
            await this.memberService.createForUser(id);
          } catch {}
        } else {
          await this.memberService.removeByUserId(id);
        }
      } else if (nextRole === UserRole.LEADER) {
        await this.memberService.removeByUserId(id);
        if (nextActive) {
          try {
            await this.leaderService.createForUser(id);
          } catch {}
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
          } catch {}
        } else {
          await this.memberService.removeByUserId(id);
        }
      } else if (nextRole === UserRole.LEADER) {
        if (nextActive) {
          try {
            await this.leaderService.createForUser(id);
          } catch {}
        } else {
          await this.leaderService.removeByUserId(id);
        }
      }
    }
    const user = await this.userRepo.update(id, dto);
    this.logger.log(UserLogs.UPDATED(id));

    // Conta que acabou de ser aprovada: até aqui o usuário ficava sabendo
    // apenas ao tentar entrar de novo.
    if (activeInDto && nextActive && !current.active) {
      await this.notifyAccountApproved(user);
    }

    return user;
  }

  /** Avisar não pode derrubar a atualização que o admin acabou de fazer. */
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
