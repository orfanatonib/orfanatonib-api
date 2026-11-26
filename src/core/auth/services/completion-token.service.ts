import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { createHmac, randomUUID } from "crypto";
import {
  COMPLETION_TOKEN_PURPOSE,
  COMPLETION_TOKEN_TTL_MINUTES,
} from "../constants/auth.constants";
import { CompletionTokenClaims } from "../types";
import { readJwtSecret } from "../utils/jwt-secret.util";

/**
 * Token de conclusão do cadastro Google.
 *
 * É assinado com uma chave derivada de `JWT_SECRET` (HMAC com o propósito), e
 * por isso nunca é aceito como JWT de sessão, nem o contrário. O uso único não
 * precisa de tabela: a conclusão vira `completed = true`, e a rota recusa
 * qualquer token cujo usuário já esteja completo.
 */
@Injectable()
export class CompletionTokenService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  issueFor(userId: string): string {
    const claims: CompletionTokenClaims = {
      sub: userId,
      purpose: COMPLETION_TOKEN_PURPOSE,
      jti: randomUUID(),
    };

    return this.jwtService.sign(claims, {
      secret: this.secret(),
      expiresIn: `${COMPLETION_TOKEN_TTL_MINUTES}m`,
    });
  }

  /** Id do usuário dono do token, ou `null` se inválido, expirado ou de outro propósito. */
  verify(token: string): string | null {
    try {
      const claims = this.jwtService.verify<CompletionTokenClaims>(token, {
        secret: this.secret(),
      });
      const valid =
        claims.purpose === COMPLETION_TOKEN_PURPOSE &&
        typeof claims.sub === "string" &&
        claims.sub.length > 0;
      return valid ? claims.sub : null;
    } catch {
      return null;
    }
  }

  private secret(): string {
    return createHmac("sha256", readJwtSecret(this.configService))
      .update(COMPLETION_TOKEN_PURPOSE)
      .digest("hex");
  }
}
