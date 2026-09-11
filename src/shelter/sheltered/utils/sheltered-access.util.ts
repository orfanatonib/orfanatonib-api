import { AuthenticatedRequest, UserRole } from "src/core/auth/auth.types";
import { ShelteredAccessContext } from "../types";

/**
 * Lookup that turns a raw JWT role into a domain role, so an unknown or
 * tampered value degrades to `null` instead of being trusted.
 */
const ROLE_BY_VALUE: Readonly<Record<string, UserRole>> = {
  [UserRole.ADMIN]: UserRole.ADMIN,
  [UserRole.MEMBER]: UserRole.MEMBER,
  [UserRole.LEADER]: UserRole.LEADER,
};

const toUserRole = (role: UserRole | string | undefined): UserRole | null => {
  if (!role) return null;
  return ROLE_BY_VALUE[String(role).toLowerCase()] ?? null;
};

/**
 * Builds the actor scope from the request populated by `JwtAuthGuard`.
 * The controller owns this transport concern so services stay HTTP-free.
 */
export const toShelteredAccessContext = (
  request: AuthenticatedRequest,
): ShelteredAccessContext => ({
  userId: request.user?.userId ?? null,
  role: toUserRole(request.user?.role),
});

/**
 * Admins are never narrowed by shelter/team scope.
 */
export const isUnscopedActor = (actor: ShelteredAccessContext): boolean =>
  actor.role === null || actor.role === UserRole.ADMIN || actor.userId === null;
