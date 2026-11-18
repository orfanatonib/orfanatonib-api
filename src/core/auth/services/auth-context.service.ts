import { Injectable } from "@nestjs/common";
import { Request } from "express";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import { UnauthenticatedException } from "src/common/exceptions";
import { JwtPayload, UserRole } from "../auth.types";
import { AuthErrorMessages } from "../constants/auth.constants";
import { RequestTokenCarriers } from "../types";
import { extractBearerToken, normalizeRole } from "../utils/auth-token.util";

/**
 * Lê o ator a partir da requisição para quem não passa pelo `JwtAuthGuard` —
 * rotas que respondem diferente para anônimo e autenticado.
 *
 * Quem já usa o guard deve ler `request.user` (`AuthenticatedRequest`) em vez
 * de decodificar o token de novo.
 */
@Injectable()
export class AuthContextService {
  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  getTokenFromRequest(req: Request): string | null {
    return extractBearerToken(req as unknown as RequestTokenCarriers);
  }

  async verifyToken(token: string): Promise<JwtPayload> {
    const secret = this.config.get<string>("JWT_SECRET");
    if (!secret) {
      throw new UnauthenticatedException(AuthErrorMessages.JWT_SECRET_MISSING);
    }

    const payload = await this.jwt.verifyAsync<JwtPayload>(token, { secret });
    return this.normalizePayload(payload);
  }

  decodeToken(token: string): JwtPayload | null {
    const payload = this.jwt.decode<JwtPayload | null>(token);
    return payload ? this.normalizePayload(payload) : null;
  }

  async getPayloadFromRequest(req: Request): Promise<JwtPayload> {
    const token = this.getTokenFromRequest(req);
    if (!token) {
      throw new UnauthenticatedException(AuthErrorMessages.TOKEN_MISSING);
    }
    return this.verifyToken(token);
  }

  /** Igual ao anterior, mas devolve `null` em vez de lançar. */
  async tryGetPayload(req: Request): Promise<JwtPayload | null> {
    try {
      return await this.getPayloadFromRequest(req);
    } catch {
      return null;
    }
  }

  async getUserId(req: Request): Promise<string | null> {
    return (await this.tryGetPayload(req))?.sub ?? null;
  }

  async getEmail(req: Request): Promise<string | null> {
    return (await this.tryGetPayload(req))?.email ?? null;
  }

  async getRole(req: Request): Promise<UserRole | null> {
    const payload = await this.tryGetPayload(req);
    return normalizeRole(payload?.role) ?? null;
  }

  async isAdmin(req: Request): Promise<boolean> {
    return (await this.getRole(req)) === UserRole.ADMIN;
  }

  async isMember(req: Request): Promise<boolean> {
    return (await this.getRole(req)) === UserRole.MEMBER;
  }

  async isLoggedIn(req: Request): Promise<boolean> {
    return (await this.tryGetPayload(req)) !== null;
  }

  private normalizePayload(payload: JwtPayload): JwtPayload {
    return { ...payload, role: normalizeRole(payload.role) };
  }
}
