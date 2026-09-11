import { Injectable } from "@nestjs/common";
import { ShelterScheduleEntity } from "src/shelter/schedule/entities/shelter-schedule.entity";
import { TeamEntity } from "src/shelter/team/entities/team.entity";
import { AttendanceEntity } from "../entities/attendance.entity";
import {
  AllPendingsResponseDto,
  PendingForLeaderDto,
  PendingForMemberDto,
  TeamPendingsDto,
  TeamVisitReportPendingsDto,
  VisitReportPendingDto,
} from "../dto/attendance-response.dto";
import { AttendanceRepository } from "../repositories/attendance.repository";
import { AttendanceScopeService } from "./attendance-scope.service";
import { AttendanceActor, AttendanceScope, ScheduleOccurrence } from "../types";
import { shortAddress, teamLabel } from "../constants";
import {
  memberUsersOf,
  toPendingMemberDto,
} from "../mappers/attendance.mapper";
import {
  formatDayBR,
  pastOccurrencesOf,
} from "../utils/attendance-occurrence.util";

/** Chave de um encontro: agendamento + categoria. */
const keyOf = (scheduleId: string, category: string): string =>
  `${scheduleId}:${category}`;

@Injectable()
export class GetPendingsService {
  constructor(
    private readonly repository: AttendanceRepository,
    private readonly scopeService: AttendanceScopeService,
  ) {}

  /**
   * As três pendências da tela inicial: o que o líder tem para lançar, o que o
   * próprio usuário não teve lançado, e as visitas sem relatório.
   *
   * Era um método de 278 linhas com consultas dentro de três laços aninhados —
   * uma por equipe, mais duas por agendamento. Agora são quatro consultas no
   * total, independentemente de quantas equipes o ator enxerga.
   */
  async execute(
    actor: AttendanceActor,
    today: Date,
  ): Promise<AllPendingsResponseDto> {
    const scope = await this.scopeService.resolve(actor);

    const leaderTeams = await this.repository.findTeamsWithMembers(
      this.scopeService.leaderTeamFilter(scope),
    );
    const memberTeams = scope.isAdmin
      ? []
      : await this.repository.findTeamsWithMembers(scope.memberTeamIds);

    const teamsById = new Map<string, TeamEntity>();
    for (const team of [...leaderTeams, ...memberTeams]) {
      teamsById.set(team.id, team);
    }

    const schedules = await this.repository.findSchedulesForTeams(
      [...teamsById.keys()],
      { before: today },
    );
    const attendances = await this.repository.findAttendancesForSchedules(
      schedules.map((schedule) => schedule.id),
    );

    return {
      leaderPendings: this.leaderPendings(
        leaderTeams,
        schedules,
        attendances,
        today,
      ),
      memberPendings: scope.isAdmin
        ? []
        : this.memberPendings(
            scope,
            memberTeams,
            schedules,
            attendances,
            today,
          ),
      visitReportPendings: await this.visitReportPendings(
        leaderTeams,
        schedules,
        today,
      ),
    };
  }

  /** Encontros em que falta alguém da equipe. */
  private leaderPendings(
    teams: readonly TeamEntity[],
    schedules: readonly ShelterScheduleEntity[],
    attendances: readonly AttendanceEntity[],
    today: Date,
  ): TeamPendingsDto[] {
    const registered = this.registeredMembersByOccurrence(attendances);
    const result: TeamPendingsDto[] = [];

    for (const team of teams) {
      const members = memberUsersOf(team);
      const pendings: PendingForLeaderDto[] = [];

      for (const occurrence of this.occurrencesOfTeam(team, schedules, today)) {
        const done =
          registered.get(keyOf(occurrence.scheduleId, occurrence.category)) ??
          new Set<string>();
        const missing = members.filter((member) => !done.has(member.id));
        if (missing.length === 0) continue;

        pendings.push({
          scheduleId: occurrence.scheduleId,
          category: occurrence.category,
          date: occurrence.date,
          location: occurrence.location,
          visitNumber: occurrence.visitNumber,
          lessonContent: occurrence.lessonContent,
          pendingMembers: missing.map(toPendingMemberDto),
          teamName: occurrence.teamName,
          shelterName: occurrence.shelterName,
          totalMembers: members.length,
        });
      }

      if (pendings.length > 0) {
        result.push({
          teamId: team.id,
          teamName: teamLabel(team.description, team.numberTeam),
          shelterName: team.shelter?.name ?? "",
          pendings,
        });
      }
    }

    return result;
  }

  /** Encontros em que a frequência do próprio usuário não foi lançada. */
  private memberPendings(
    scope: AttendanceScope,
    teams: readonly TeamEntity[],
    schedules: readonly ShelterScheduleEntity[],
    attendances: readonly AttendanceEntity[],
    today: Date,
  ): PendingForMemberDto[] {
    const mine = new Set(
      attendances
        .filter((record) => record.member.id === scope.actor.userId)
        .map((record) => keyOf(record.shelterSchedule.id, record.category)),
    );

    const result: PendingForMemberDto[] = [];

    for (const team of teams) {
      for (const occurrence of this.occurrencesOfTeam(team, schedules, today)) {
        if (mine.has(keyOf(occurrence.scheduleId, occurrence.category))) {
          continue;
        }

        result.push({
          scheduleId: occurrence.scheduleId,
          category: occurrence.category,
          date: occurrence.date,
          location: occurrence.location,
          visitNumber: occurrence.visitNumber,
          teamNumber: occurrence.teamNumber,
          shelterName: occurrence.shelterName,
          teamName: occurrence.teamName,
          lessonContent: occurrence.lessonContent || "",
          teamId: occurrence.teamId,
        });
      }
    }

    return result;
  }

  /** Visitas já realizadas que ainda não têm relatório. */
  private async visitReportPendings(
    teams: readonly TeamEntity[],
    schedules: readonly ShelterScheduleEntity[],
    today: Date,
  ): Promise<TeamVisitReportPendingsDto[]> {
    const teamIds = new Set(teams.map((team) => team.id));
    const pastVisits = schedules.filter(
      (schedule) =>
        teamIds.has(schedule.team?.id) &&
        schedule.visitDate &&
        new Date(schedule.visitDate) < today,
    );

    const withReport = await this.repository.findScheduleIdsWithReport(
      pastVisits.map((schedule) => schedule.id),
    );

    const result: TeamVisitReportPendingsDto[] = [];

    for (const team of teams) {
      const pendings: VisitReportPendingDto[] = pastVisits
        .filter(
          (schedule) =>
            schedule.team.id === team.id && !withReport.has(schedule.id),
        )
        .map((schedule) => this.toVisitReportPending(schedule, team));

      if (pendings.length > 0) {
        result.push({
          teamId: team.id,
          teamName: teamLabel(team.description, team.numberTeam),
          shelterName: team.shelter?.name ?? "",
          pendings,
        });
      }
    }

    return result;
  }

  private toVisitReportPending(
    schedule: ShelterScheduleEntity,
    team: TeamEntity,
  ): VisitReportPendingDto {
    const visitDateFormatted = formatDayBR(schedule.visitDate!);

    return {
      scheduleId: schedule.id,
      visitNumber: schedule.visitNumber,
      visitDate: schedule.visitDate!,
      visitDateFormatted,
      summary: `Rodada ${schedule.visitNumber} • ${visitDateFormatted} • ${schedule.lessonContent || "Sem lição definida"}`,
      lessonContent: schedule.lessonContent,
      observation: schedule.observation,
      teamId: team.id,
      teamNumber: team.numberTeam,
      teamName: teamLabel(team.description, team.numberTeam),
      shelterName: team.shelter?.name ?? "",
      shelterAddress: shortAddress(team.shelter?.address),
    };
  }

  /** Quem já teve frequência lançada, por encontro. */
  private registeredMembersByOccurrence(
    attendances: readonly AttendanceEntity[],
  ): Map<string, Set<string>> {
    const byOccurrence = new Map<string, Set<string>>();

    for (const record of attendances) {
      const key = keyOf(record.shelterSchedule.id, record.category);
      const members = byOccurrence.get(key) ?? new Set<string>();
      members.add(record.member.id);
      byOccurrence.set(key, members);
    }

    return byOccurrence;
  }

  private occurrencesOfTeam(
    team: TeamEntity,
    schedules: readonly ShelterScheduleEntity[],
    today: Date,
  ): ScheduleOccurrence[] {
    return schedules
      .filter((schedule) => schedule.team?.id === team.id)
      .flatMap((schedule) => pastOccurrencesOf(schedule, team, today));
  }
}
