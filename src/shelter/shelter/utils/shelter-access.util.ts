import { AuthenticatedRequest, UserRole } from "src/core/auth/auth.types";
import { AccessDeniedException } from "src/common/exceptions";
import { SHELTER_MESSAGES } from "../constants";
import { ShelterAccessContext } from "../types";

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
 * Escopo do ator a partir da requisição populada pelo `JwtAuthGuard`.
 * O controller resolve isso para os serviços ficarem livres de HTTP.
 */
export const toShelterAccessContext = (
  request: AuthenticatedRequest,
): ShelterAccessContext => ({
  userId: request.user?.userId ?? null,
  role: toUserRole(request.user?.role),
});

/** Admin enxerga tudo; os demais são filtrados pelos abrigos que lideram. */
export const isUnscopedActor = (actor: ShelterAccessContext): boolean =>
  actor.role === null || actor.role === UserRole.ADMIN || actor.userId === null;

/**
 * Gestão de abrigo é de admin e líder. Membro — e ator sem papel — não escreve
 * nem lista a visão administrativa.
 */
export const assertCanManageShelters = (actor: ShelterAccessContext): void => {
  if (actor.role === null || actor.role === UserRole.MEMBER) {
    throw new AccessDeniedException(SHELTER_MESSAGES.ACCESS_DENIED);
  }
};

/**
 * Criar abrigo é só do admin: o líder administra os abrigos que lidera, e um abrigo que
 * ainda não existe não pode estar no escopo dele.
 */
export const assertCanCreateShelters = (actor: ShelterAccessContext): void => {
  if (actor.role !== UserRole.ADMIN) {
    throw new AccessDeniedException(SHELTER_MESSAGES.ACCESS_DENIED);
  }
};
