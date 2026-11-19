import { UserRole } from "src/core/auth/auth.types";
import type { ShelterAccessContext } from "src/shelter/shelter/types";
import type { GetTeamsService } from "src/shelter/team/services/get-teams.service";
import {
  assertCanAttemptTeamWrite,
  assertCanManageTeamsIn,
} from "src/shelter/team/utils/team-access.util";

/**
 * Escrita em agenda de abrigo (plano 21): admin em qualquer abrigo; líder só nos
 * abrigos em que lidera uma equipe; membro e ator sem papel nunca. A fronteira
 * é a mesma da escrita em equipes — não existe uma segunda regra para a agenda.
 */
export const assertCanManageScheduleIn = async (
  actor: ShelterAccessContext,
  shelterId: string,
  teams: Pick<GetTeamsService, "findLedShelterIds">,
): Promise<void> => {
  const led =
    actor.role === UserRole.LEADER && actor.userId
      ? await teams.findLedShelterIds(actor.userId)
      : new Set<string>();
  assertCanManageTeamsIn(actor, shelterId, led);
};

/** Falha cedo (antes do banco) para quem nunca poderia escrever. */
export const assertCanAttemptScheduleWrite = assertCanAttemptTeamWrite;
