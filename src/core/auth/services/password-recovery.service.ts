import { Injectable, Logger } from "@nestjs/common";
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
import { AuthLogs } from "../constants/auth.constants";
import { errorMessageOf } from "../utils/auth-token.util";
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
  private readonly logger = new Logger(PasswordRecoveryService.name);

  constructor(
    private readonly getUsersService: GetUsersService,
    private readonly updateUserService: UpdateUserService,
    private readonly notificationService: NotificationService,
    private readonly passwordResetTokenRepo: PasswordResetTokenRepository,
  ) {}

  /**
   * Resposta imediata e idêntica para qualquer e-mail: o envio roda em segundo
   * plano e só acontece se a conta existir e estiver completa. Quem pede não
   * descobre quais e-mails existem, nem pelo corpo nem pelo tempo.
   */
  forgotPassword(data: ForgotPasswordDto): Promise<PasswordRecoveryResponse> {
    void this.deliverResetLink(data.email);

    return Promise.resolve({
      status: PasswordRecoveryStatus.RESET_LINK_SENT,
      message: PasswordRecoveryMessages.RESET_LINK_SENT,
    });
  }

  /** Nunca lança: roda desanexado da resposta HTTP. */
  async deliverResetLink(email: string): Promise<void> {
    try {
      const user = await this.getUsersService.findByEmail(email);
      // Conta Google pendente não tem senha a recuperar.
      if (!user || !user.completed) return;

      const resetToken = crypto
        .randomBytes(PASSWORD_RESET_TOKEN_BYTES)
        .toString("hex");
      const expiresAt = new Date(
        Date.now() + PASSWORD_RESET_TTL_MINUTES * 60 * 1000,
      );

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
    } catch (error: unknown) {
      this.logger.error(
        AuthLogs.PASSWORD_RECOVERY_FAILED(errorMessageOf(error)),
      );
    }
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

    // O aviso é cortesia: a senha já mudou e o token já foi gasto, então uma
    // falha na fila de e-mail não pode transformar o reset em erro.
    try {
      await this.notificationService.sendPasswordChangedEmail(
        user.email,
        user.name,
      );
    } catch (error: unknown) {
      this.logger.warn(
        AuthLogs.PASSWORD_CHANGED_EMAIL_FAILED(user.id, errorMessageOf(error)),
      );
    }

    return { message: PasswordRecoveryMessages.PASSWORD_CHANGED };
  }
}
