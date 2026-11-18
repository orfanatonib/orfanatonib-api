import { AccessDeniedException } from "src/common/exceptions";
import { UserRole } from "src/core/auth/auth.types";
import type { ShelterAccessContext } from "src/shelter/shelter/types";

export const TEAM_ACCESS_DENIED = "Acesso negado.";

/**
 * Escrita em equipes: admin em qualquer abrigo; líder só nos abrigos em que
 * lidera uma equipe; membro e ator sem papel nunca.
 */
export const assertCanManageTeamsIn = (
  actor: ShelterAccessContext,
  shelterId: string,
  ledShelterIds: ReadonlySet<string>,
): void => {
  if (actor.role === UserRole.ADMIN) return;
  if (actor.role === UserRole.LEADER && ledShelterIds.has(shelterId)) return;
  throw new AccessDeniedException(TEAM_ACCESS_DENIED);
};

/** Falha cedo (antes de consultar o banco) para quem nunca poderia escrever. */
export const assertCanAttemptTeamWrite = (
  actor: ShelterAccessContext,
): void => {
  if (actor.role !== UserRole.ADMIN && actor.role !== UserRole.LEADER) {
    throw new AccessDeniedException(TEAM_ACCESS_DENIED);
  }
};
