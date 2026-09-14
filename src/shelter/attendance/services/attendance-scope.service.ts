import { Injectable } from "@nestjs/common";
import {
  AccessDeniedException,
  ResourceNotFoundException,
} from "src/common/exceptions";
import { UserRole } from "src/core/auth/auth.types";
import { AttendanceRepository } from "../repositories/attendance.repository";
import { ATTENDANCE_MESSAGES } from "../constants";
import { AttendanceActor, AttendanceScope } from "../types";

/**
 * Resolve, de uma vez, quais equipes o ator alcança.
 *
 * Antes cada método refazia essa pergunta: `getUserWithMembership` e
 * `getLeaderTeamIds` eram chamados de novo a cada endpoint, e o `assert*`
 * disparava outras duas consultas.
 */
@Injectable()
export class AttendanceScopeService {
  constructor(private readonly repository: AttendanceRepository) {}

  async resolve(actor: AttendanceActor): Promise<AttendanceScope> {
    const user = await this.repository.findUserWithMembership(actor.userId);
    if (!user) {
      throw new ResourceNotFoundException(ATTENDANCE_MESSAGES.USER_NOT_FOUND);
    }

    const role = actor.role ?? user.role;
    if (role === UserRole.ADMIN) {
      return {
        actor: { ...actor, role },
        user,
        isAdmin: true,
        leaderTeamIds: [],
        memberTeamIds: [],
      };
    }

    const [leaderTeamIds, memberTeamIds] = await Promise.all([
      this.repository.findLeaderTeamIds(actor.userId),
      this.repository.findMemberTeamIds(actor.userId),
    ]);

    return {
      actor: { ...actor, role },
      user,
      isAdmin: false,
      leaderTeamIds,
      memberTeamIds,
    };
  }

  /** Só admin e o líder da equipe lançam frequência por ela. */
  assertLeads(scope: AttendanceScope, teamId: string): void {
    if (scope.isAdmin) return;
    if (!scope.leaderTeamIds.includes(teamId)) {
      throw new AccessDeniedException(ATTENDANCE_MESSAGES.NOT_TEAM_LEADER);
    }
  }

  /** Membro ou líder da equipe. */
  assertBelongs(scope: AttendanceScope, teamId: string): void {
    if (scope.isAdmin) return;
    if (
      !scope.leaderTeamIds.includes(teamId) &&
      !scope.memberTeamIds.includes(teamId)
    ) {
      throw new AccessDeniedException(ATTENDANCE_MESSAGES.NOT_TEAM_MEMBER);
    }
  }

  /** Equipes que o ator lidera; `undefined` para admin, que enxerga todas. */
  leaderTeamFilter(scope: AttendanceScope): readonly string[] | undefined {
    return scope.isAdmin ? undefined : scope.leaderTeamIds;
  }

  /** Todas as equipes do ator; `undefined` para admin. */
  allTeamFilter(scope: AttendanceScope): readonly string[] | undefined {
    if (scope.isAdmin) return undefined;
    return [...new Set([...scope.leaderTeamIds, ...scope.memberTeamIds])];
  }
}
