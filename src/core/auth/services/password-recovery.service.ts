import { Injectable } from "@nestjs/common";
import { RuleException } from "src/common/exceptions";
import * as crypto from "crypto";
import { GetUsersService } from "../../user/services/get-user.service";
import { UpdateUserService } from "../../user/services/update-user.service";
import { NotificationService } from "src/communication/notification/services/notification.service";
import { ForgotPasswordDto } from "../dto/forgot-password.dto";
import { ResetPasswordDto } from "../dto/reset-password.dto";
import { PasswordResetTokenRepository } from "../repositories/password-reset-token.repository";
import {
  PasswordRecoveryStatus,
  PasswordRecoveryMessages,
} from "../constants/password-recovery.constants";
import {
  PASSWORD_RESET_TOKEN_BYTES,
  PASSWORD_RESET_TTL_MINUTES,
} from "../constants/auth.constants";
import {
  PasswordRecoveryResponse,
  ResetPasswordResponse,
  ValidateResetTokenResponse,
} from "../types/password-recovery.types";

@Injectable()
export class PasswordRecoveryService {
  constructor(
    private readonly getUsersService: GetUsersService,
    private readonly updateUserService: UpdateUserService,
    private readonly notificationService: NotificationService,
    private readonly passwordResetTokenRepo: PasswordResetTokenRepository,
  ) {}

  async forgotPassword(
    data: ForgotPasswordDto,
  ): Promise<PasswordRecoveryResponse> {
    const user = await this.getUsersService.findByEmail(data.email);
    if (!user) {
      throw new RuleException(PasswordRecoveryMessages.USER_NOT_FOUND);
    }

    const resetToken = crypto
      .randomBytes(PASSWORD_RESET_TOKEN_BYTES)
      .toString("hex");
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + PASSWORD_RESET_TTL_MINUTES);

    await this.passwordResetTokenRepo.invalidateTokensForUser(user.id);
    await this.passwordResetTokenRepo.createToken(
      user.id,
      resetToken,
      expiresAt,
    );

    // O link é montado aqui: o módulo de notificação não conhece as rotas
    // do frontend nem a validade do token deste fluxo.
    await this.notificationService.sendPasswordResetEmail(
      user.email,
      user.name,
      `${this.notificationService.appUrl()}/recuperar-senha/${resetToken}`,
      PASSWORD_RESET_TTL_MINUTES,
    );

    return {
      status: PasswordRecoveryStatus.RESET_LINK_SENT,
      message: PasswordRecoveryMessages.RESET_LINK_SENT,
    };
  }

  async validateResetToken(token: string): Promise<ValidateResetTokenResponse> {
    const validToken = await this.passwordResetTokenRepo.findValidToken(token);
    if (!validToken) {
      throw new RuleException(PasswordRecoveryMessages.TOKEN_INVALID);
    }
    return { valid: true, email: validToken.user.email };
  }

  async resetPassword(dto: ResetPasswordDto): Promise<ResetPasswordResponse> {
    const validToken = await this.passwordResetTokenRepo.findValidToken(
      dto.token,
    );
    if (!validToken) {
      throw new RuleException(PasswordRecoveryMessages.TOKEN_INVALID);
    }

    const user = validToken.user;

    await this.updateUserService.update(user.id, {
      password: dto.newPassword,
    });

    await this.passwordResetTokenRepo.deleteToken(dto.token);

    await this.notificationService.sendPasswordChangedEmail(
      user.email,
      user.name,
    );

    return { message: PasswordRecoveryMessages.PASSWORD_CHANGED };
  }
}
