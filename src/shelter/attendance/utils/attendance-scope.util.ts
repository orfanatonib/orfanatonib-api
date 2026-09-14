import { AuthenticatedRequest, UserRole } from "src/core/auth/auth.types";
import { UnauthenticatedException } from "src/common/exceptions";
import { ATTENDANCE_MESSAGES } from "../constants";
import { AttendanceActor } from "../types";

const ROLE_BY_VALUE: Readonly<Record<string, UserRole>> = {
  [UserRole.ADMIN]: UserRole.ADMIN,
  [UserRole.MEMBER]: UserRole.MEMBER,
  [UserRole.LEADER]: UserRole.LEADER,
};

const toUserRole = (role: UserRole | string | undefined): UserRole | null =>
  role ? (ROLE_BY_VALUE[String(role).toLowerCase()] ?? null) : null;

/**
 * Ator a partir da requisição populada pelo `JwtAuthGuard`.
 *
 * O controller lia `req.user?.id`, campo que **nunca existe**: a
 * `JwtStrategy.validate` devolve `userId`. Todo endpoint caía no fallback e
 * decodificava o token uma segunda vez, a cada requisição.
 */
export const toAttendanceActor = (
  request: AuthenticatedRequest,
): AttendanceActor => {
  const userId = request.user?.userId;
  if (!userId) {
    throw new UnauthenticatedException(ATTENDANCE_MESSAGES.USER_NOT_IDENTIFIED);
  }

  return { userId, role: toUserRole(request.user?.role) };
};
