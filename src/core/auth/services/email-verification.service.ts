import { Injectable, Logger } from "@nestjs/common";
import { randomBytes } from "crypto";
import { RuleException } from "src/common/exceptions";
import { NotificationService } from "src/communication/notification/services/notification.service";
import { GetUsersService } from "src/core/user/services/get-user.service";
import { UpdateUserService } from "src/core/user/services/update-user.service";
import { UserEntity } from "src/core/user/entities/user.entity";
import { EmailVerificationTokenRepository } from "../repositories/email-verification-token.repository";
import {
  AuthErrorMessages,
  AuthLogs,
  AuthVerificationMessages,
  EMAIL_VERIFICATION_PATH,
  EMAIL_VERIFICATION_TOKEN_BYTES,
  EMAIL_VERIFICATION_TTL_HOURS,
} from "../constants/auth.constants";
import {
  EmailVerificationStatusDto,
  VerifyEmailResultDto,
} from "../dto/email-verification.response.dto";
import { errorMessageOf } from "../utils/auth-token.util";

/**
 * Confirmação de que o e-mail cadastrado é mesmo de quem se cadastrou.
 *
 * Independente da aprovação da conta (`active`), que continua sendo da
 * coordenação: confirmar o e-mail não libera o acesso sozinho.
 */
@Injectable()
export class EmailVerificationService {
  private readonly logger = new Logger(EmailVerificationService.name);

  constructor(
    private readonly tokens: EmailVerificationTokenRepository,
    private readonly notificationService: NotificationService,
    private readonly getUsersService: GetUsersService,
    private readonly updateUserService: UpdateUserService,
  ) {}

  /**
   * Emite um link novo e enfileira o e-mail.
   *
   * Nunca lança: o cadastro não pode falhar porque o e-mail não saiu. O
   * retorno diz se o envio foi aceito, e é isso que a tela de cadastro mostra.
   */
  async requestFor(user: UserEntity): Promise<EmailVerificationStatusDto> {
    if (user.emailVerifiedAt) {
      return {
        verificationEmailSent: false,
        message: AuthVerificationMessages.ALREADY_VERIFIED,
      };
    }

    try {
      const token = randomBytes(EMAIL_VERIFICATION_TOKEN_BYTES).toString("hex");
      const expiresAt = new Date(
        Date.now() + EMAIL_VERIFICATION_TTL_HOURS * 60 * 60 * 1000,
      );

      await this.tokens.invalidatePendingForUser(user.id);
      await this.tokens.createToken(user.id, token, expiresAt);

      await this.notificationService.sendEmailVerification(
        user.email,
        user.name,
        `${this.notificationService.appUrl()}/${EMAIL_VERIFICATION_PATH}/${token}`,
        EMAIL_VERIFICATION_TTL_HOURS,
      );

      this.logger.log(AuthLogs.VERIFICATION_SENT(user.id));
      return {
        verificationEmailSent: true,
        message: AuthVerificationMessages.SENT,
      };
    } catch (error: unknown) {
      this.logger.error(
        AuthLogs.VERIFICATION_SEND_FAILED(user.id, errorMessageOf(error)),
      );
      return { verificationEmailSent: false };
    }
  }

  /** Confirma o e-mail a partir do token do link. */
  async confirm(token: string): Promise<VerifyEmailResultDto> {
    const entry = await this.tokens.findUsableToken(token);
    if (!entry) {
      throw new RuleException(AuthErrorMessages.VERIFICATION_TOKEN_INVALID);
    }

    // Sem transação: a ordem limita o estrago. Se a confirmação do e-mail falhar,
    // o token continua válido e o usuário pode tentar de novo; o contrário
    // (token gasto e e-mail não confirmado) o deixaria sem saída.
    const now = new Date();
    await this.updateUserService.markEmailVerified(entry.userId, now);
    await this.tokens.markUsed(entry.id, now);

    this.logger.log(AuthLogs.VERIFICATION_CONFIRMED(entry.userId));

    return {
      verified: true,
      email: entry.user.email,
      message: AuthVerificationMessages.CONFIRMED,
    };
  }

  /**
   * Reenvia o link. A resposta é a mesma para e-mail existente, inexistente ou
   * já confirmado — não revela quais e-mails estão cadastrados.
   */
  async resend(email: string): Promise<EmailVerificationStatusDto> {
    const user = await this.getUsersService.findByEmail(email);
    if (user && !user.emailVerifiedAt) {
      await this.requestFor(user);
    }

    return {
      verificationEmailSent: true,
      message: AuthVerificationMessages.RESEND_ACCEPTED,
    };
  }

  /** Estado a devolver no login de quem ainda não confirmou. */
  statusFor(user: UserEntity): EmailVerificationStatusDto | undefined {
    if (user.emailVerifiedAt) return undefined;
    return {
      verificationEmailSent: false,
      message: AuthVerificationMessages.SENT,
    };
  }
}
