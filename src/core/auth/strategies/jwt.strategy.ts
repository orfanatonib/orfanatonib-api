import { Injectable, Logger } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { ConfigService } from "@nestjs/config";
import { AuthenticatedUser, JwtPayload } from "../auth.types";
import { readJwtSecret } from "../utils/jwt-secret.util";
import { AuthLogs } from "../constants/auth.constants";

/**
 * Popula `request.user` nas rotas com `JwtAuthGuard`. O formato devolvido aqui
 * é o `AuthenticatedUser` que os controllers leem — em particular `userId`,
 * não `id`.
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, "jwt") {
  private readonly logger = new Logger(JwtStrategy.name);

  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: readJwtSecret(configService),
    });
  }

  validate(payload: JwtPayload): AuthenticatedUser {
    const { sub: userId, email, role } = payload;

    if (!role) {
      this.logger.warn(AuthLogs.MISSING_ROLE_IN_TOKEN(userId));
    }

    return { userId, email, role };
  }
}
