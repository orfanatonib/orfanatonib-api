import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { OAuth2Client, type TokenPayload } from "google-auth-library";
import { UnauthenticatedException } from "src/common/exceptions";
import { CreateUserService } from "src/core/user/services/create-user.service";
import { GetUsersService } from "src/core/user/services/get-user.service";
import { UserEntity } from "src/core/user/entities/user.entity";
import { UserRole } from "../auth.types";
import {
  AuthErrorMessages,
  AuthLogs,
  AuthSuccessMessages,
  GOOGLE_EXPIRED_TOKEN_HINTS,
  GOOGLE_INVALID_TOKEN_HINTS,
} from "../constants/auth.constants";
import { GoogleLoginResult } from "../dto/auth.response.dto";
import { toAuthUserDto } from "../mappers/auth-user.mapper";
import { errorMessageOf, messageMatches } from "../utils/auth-token.util";
import { AuthTokenService } from "./auth-token.service";

@Injectable()
export class GoogleLoginService {
  private readonly logger = new Logger(GoogleLoginService.name);
  private readonly googleClient: OAuth2Client;

  constructor(
    private readonly configService: ConfigService,
    private readonly getUsersService: GetUsersService,
    private readonly createUserService: CreateUserService,
    private readonly tokenService: AuthTokenService,
  ) {
    this.googleClient = new OAuth2Client(this.clientId());
  }

  async execute(token: string | undefined): Promise<GoogleLoginResult> {
    const { email, name } = await this.verify(token);
    const existing = await this.getUsersService.findByEmail(email);

    if (!existing) return this.registerPending(email, name);
    if (!existing.completed) return this.pending(existing, email, name);
    if (!existing.active) return this.inactive(existing);

    const tokens = await this.tokenService.issueFor(existing);
    this.logger.log(AuthLogs.GOOGLE_LOGIN_SUCCESS);

    return {
      message: AuthSuccessMessages.LOGIN_SUCCESS,
      isNewUser: false,
      user: toAuthUserDto(existing),
      ...tokens,
    };
  }

  /**
   * A `google-auth-library` não expõe código de erro tipado; a distinção entre
   * token expirado e inválido sai da mensagem, e qualquer outra falha vira a
   * mensagem genérica.
   */
  private async verify(
    token: string | undefined,
  ): Promise<{ email: string; name: string }> {
    let payload: TokenPayload | undefined;

    try {
      const ticket = await this.googleClient.verifyIdToken({
        idToken: token ?? "",
        audience: this.clientId(),
      });
      payload = ticket.getPayload();
    } catch (error: unknown) {
      const reason = errorMessageOf(error);
      this.logger.error(AuthLogs.GOOGLE_LOGIN_ERROR(reason));

      if (messageMatches(reason, GOOGLE_EXPIRED_TOKEN_HINTS)) {
        throw new UnauthenticatedException(
          AuthErrorMessages.GOOGLE_TOKEN_EXPIRED,
        );
      }
      if (messageMatches(reason, GOOGLE_INVALID_TOKEN_HINTS)) {
        throw new UnauthenticatedException(
          AuthErrorMessages.GOOGLE_TOKEN_INVALID,
        );
      }
      throw new UnauthenticatedException(AuthErrorMessages.GOOGLE_AUTH_FAILED);
    }

    if (!payload?.email || !payload.name) {
      throw new UnauthenticatedException(
        AuthErrorMessages.INVALID_GOOGLE_TOKEN,
      );
    }
    return { email: payload.email, name: payload.name };
  }

  /** Primeiro acesso pelo Google: a conta nasce inativa e incompleta. */
  private async registerPending(
    email: string,
    name: string,
  ): Promise<GoogleLoginResult> {
    const user = await this.createUserService.create({
      email,
      name,
      password: "",
      phone: "",
      active: false,
      completed: false,
      commonUser: false,
      role: UserRole.MEMBER,
    });

    return this.pending(user, email, name);
  }

  private pending(
    user: UserEntity,
    email: string,
    name: string,
  ): GoogleLoginResult {
    return {
      email,
      name,
      completed: user.completed,
      commonUser: user.commonUser,
      newUser: true,
    };
  }

  private inactive(user: UserEntity): GoogleLoginResult {
    return {
      message: AuthErrorMessages.USER_INACTIVE,
      active: false,
      completed: user.completed,
      commonUser: user.commonUser,
      newUser: false,
    };
  }

  private clientId(): string {
    return this.configService.getOrThrow<string>("GOOGLE_CLIENT_ID");
  }
}
