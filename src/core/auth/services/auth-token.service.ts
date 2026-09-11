import { Injectable } from "@nestjs/common";
import { randomUUID } from "crypto";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { UnauthenticatedException } from "src/common/exceptions";
import { GetUsersService } from "src/core/user/services/get-user.service";
import { UpdateUserService } from "src/core/user/services/update-user.service";
import { UserEntity } from "src/core/user/entities/user.entity";
import {
  AuthErrorMessages,
  AuthSuccessMessages,
} from "../constants/auth.constants";
import { AuthTokensDto, MessageResponseDto } from "../dto/auth.response.dto";
import { AuthTokenClaims, RefreshTokenClaims } from "../types";
import { toExpiresIn } from "../utils/auth-token.util";
import { JwtPayload } from "../auth.types";

/**
 * O ciclo de vida dos tokens: emitir, renovar e encerrar. Os três casos de uso
 * de entrada (senha, Google e refresh) emitem pelo mesmo caminho.
 */
@Injectable()
export class AuthTokenService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly getUsersService: GetUsersService,
    private readonly updateUserService: UpdateUserService,
  ) {}

  /** Emite o par e já persiste o refresh, que é comparado na renovação. */
  async issueFor(user: UserEntity): Promise<AuthTokensDto> {
    const claims: AuthTokenClaims = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    // `jti` garante que cada refresh emitido seja uma string nova: sem ele,
    // duas emissões no mesmo segundo saem iguais e a rotação não invalida nada.
    const refreshClaims: RefreshTokenClaims = { ...claims, jti: randomUUID() };

    const tokens: AuthTokensDto = {
      accessToken: this.jwtService.sign(claims),
      refreshToken: this.jwtService.sign(refreshClaims, {
        secret: this.refreshSecret(),
        expiresIn: toExpiresIn(
          this.configService.getOrThrow<string>("JWT_REFRESH_EXPIRES_IN"),
        ),
      }),
    };

    await this.updateUserService.setRefreshToken(user.id, tokens.refreshToken);
    return tokens;
  }

  /**
   * Renova o par. Um refresh válido que não seja o último emitido é recusado:
   * é o que invalida a sessão antiga depois de um logout ou de outra renovação.
   */
  async refresh(token: string | undefined): Promise<AuthTokensDto> {
    if (!token) {
      throw new UnauthenticatedException(
        AuthErrorMessages.REFRESH_TOKEN_REQUIRED,
      );
    }

    const user = await this.userOfRefreshToken(token);
    if (!user) {
      throw new UnauthenticatedException(
        AuthErrorMessages.INVALID_REFRESH_TOKEN,
      );
    }

    return this.issueFor(user);
  }

  async logout(userId: string): Promise<MessageResponseDto> {
    await this.updateUserService.setRefreshToken(userId, null);
    return { message: AuthSuccessMessages.LOGOUT_SUCCESS };
  }

  private async userOfRefreshToken(token: string): Promise<UserEntity | null> {
    let payload: JwtPayload;
    try {
      payload = this.jwtService.verify<JwtPayload>(token, {
        secret: this.refreshSecret(),
      });
    } catch {
      return null;
    }

    const user = await this.getUsersService.findByIdOrNull(payload.sub);
    return user && user.refreshToken === token ? user : null;
  }

  private refreshSecret(): string {
    return this.configService.getOrThrow<string>("JWT_REFRESH_SECRET");
  }
}
