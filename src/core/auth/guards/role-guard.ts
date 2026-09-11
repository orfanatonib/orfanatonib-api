import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import { AccessDeniedException } from "src/common/exceptions";
import { AuthenticatedRequest, UserRole } from "../auth.types";
import { AuthErrorMessages } from "../constants/auth.constants";
import { normalizeRole } from "../utils/auth-token.util";

/**
 * Base dos guards de papel. Roda depois do `JwtAuthGuard`, que já populou
 * `request.user`; aqui só se decide se o papel serve.
 */
abstract class RoleGuard implements CanActivate {
  protected abstract readonly allowed: readonly UserRole[];
  protected abstract readonly deniedMessage: string;

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = request.user;

    if (!user) {
      throw new AccessDeniedException(AuthErrorMessages.NOT_AUTHENTICATED);
    }

    const role = normalizeRole(user.role);
    if (!role) {
      throw new AccessDeniedException(
        AuthErrorMessages.INSUFFICIENT_PERMISSIONS,
      );
    }
    if (!this.allowed.includes(role)) {
      throw new AccessDeniedException(this.deniedMessage);
    }

    return true;
  }
}

@Injectable()
export class AdminRoleGuard extends RoleGuard {
  protected readonly allowed = [UserRole.ADMIN] as const;
  protected readonly deniedMessage = AuthErrorMessages.ADMIN_ONLY;
}

@Injectable()
export class AdminOrLeaderRoleGuard extends RoleGuard {
  protected readonly allowed = [UserRole.ADMIN, UserRole.LEADER] as const;
  protected readonly deniedMessage = AuthErrorMessages.ADMIN_OR_LEADER_ONLY;
}
