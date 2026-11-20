import { Injectable } from "@nestjs/common";
import { ShelterScheduleEntity } from "src/shelter/schedule/entities/shelter-schedule.entity";
import { TeamEntity } from "src/shelter/team/entities/team.entity";
import {
  AttendanceEntity,
  AttendanceType,
} from "../entities/attendance.entity";
import { AttendanceRepository } from "../repositories/attendance.repository";
import { AttendanceScopeService } from "./attendance-scope.service";
import { AttendanceActor } from "../types";
import { AttendancePeriodDto } from "../dto/attendance-filters.dto";
import {
  ScheduleWithAttendanceDto,
  ShelterWithTeamsDto,
  TeamScheduleDto,
  TeamWithSchedulesDto,
} from "../dto/attendance-response.dto";
import { teamLabel } from "../constants";
import {
  memberUsersOf,
  toAttendanceRecordDto,
} from "../mappers/attendance.mapper";
import {
  byDateDesc,
  occurrencesOf,
  occurrenceInPeriod,
} from "../utils/attendance-occurrence.util";

@Injectable()
export class GetSchedulesService {
  constructor(
    private readonly repository: AttendanceRepository,
    private readonly scopeService: AttendanceScopeService,
  ) {}

  /** Encontros de uma equipe, com quantos já foram lançados em cada um. */
  async listTeamSchedules(
    actor: AttendanceActor,
    teamId: string,
    period: AttendancePeriodDto = {},
  ): Promise<TeamScheduleDto[]> {
    const scope = await this.scopeService.resolve(actor);
    this.scopeService.assertBelongs(scope, teamId);

    const team = await this.repository.findTeamWithMembers(teamId);
    if (!team) return [];

    const schedules = await this.repository.findSchedulesForTeams(
      [teamId],
      period,
    );
    const attendances = await this.repository.findAttendancesForSchedules(
      schedules.map((schedule) => schedule.id),
    );
    const counts = this.countByOccurrence(attendances);
    const totalMembers = memberUsersOf(team).length;

    return schedules
      .flatMap((schedule) => occurrencesOf(schedule, team))
      .filter((occurrence) => occurrenceInPeriod(occurrence, period))
      .map((occurrence) => ({
        id: occurrence.scheduleId,
        category: occurrence.category,
        date: occurrence.date,
        visitNumber: occurrence.visitNumber,
        lessonContent: occurrence.lessonContent,
        observation: occurrence.observation,
        location: occurrence.location,
        teamId: occurrence.teamId,
        teamNumber: occurrence.teamNumber,
        teamName: occurrence.teamName,
        shelterName: occurrence.shelterName,
        attendanceCount:
          counts.get(`${occurrence.scheduleId}:${occurrence.category}`)
            ?.length ?? 0,
        totalMembers,
      }))
      .sort(byDateDesc);
  }

  /**
   * Folhas de frequência em árvore: abrigo → equipe → encontro → registros.
   *
   * Eram três laços aninhados com uma consulta de agendamentos por equipe e
   * uma de frequência por agendamento. Agora são três consultas no total.
   */
  async listSheetsHierarchical(
    actor: AttendanceActor,
    period: AttendancePeriodDto = {},
  ): Promise<ShelterWithTeamsDto[]> {
    const scope = await this.scopeService.resolve(actor);
    const filter = this.scopeService.leaderTeamFilter(scope);
    if (filter && filter.length === 0) return [];

    const teams = await this.repository.findTeamsWithMembers(filter);
    const schedules = await this.repository.findSchedulesForTeams(
      teams.map((team) => team.id),
      period,
    );
    const attendances = await this.repository.findAttendancesForSchedules(
      schedules.map((schedule) => schedule.id),
    );
    const byOccurrence = this.countByOccurrence(attendances);

    const byShelter = new Map<string, ShelterWithTeamsDto>();

    for (const team of teams) {
      const shelterId = team.shelter?.id ?? "";
      const shelter = byShelter.get(shelterId) ?? {
        shelterId,
        shelterName: team.shelter?.name ?? "",
        totalTeams: 0,
        teams: [],
      };

      shelter.totalTeams += 1;
      shelter.teams.push(
        this.toTeamWithSchedules(team, schedules, byOccurrence, period),
      );
      byShelter.set(shelterId, shelter);
    }

    return [...byShelter.values()];
  }

  private toTeamWithSchedules(
    team: TeamEntity,
    schedules: readonly ShelterScheduleEntity[],
    byOccurrence: Map<string, AttendanceEntity[]>,
    period: AttendancePeriodDto,
  ): TeamWithSchedulesDto {
    const teamSchedules = schedules.filter(
      (schedule) => schedule.team?.id === team.id,
    );
    const totalMembers = memberUsersOf(team).length;

    const withAttendance: ScheduleWithAttendanceDto[] = teamSchedules
      .flatMap((schedule) => occurrencesOf(schedule, team))
      .filter((occurrence) => occurrenceInPeriod(occurrence, period))
      .map((occurrence) => {
        const records =
          byOccurrence.get(`${occurrence.scheduleId}:${occurrence.category}`) ??
          [];

        return {
          scheduleId: occurrence.scheduleId,
          category: occurrence.category,
          date: occurrence.date,
          visitNumber: occurrence.visitNumber,
          lessonContent: occurrence.lessonContent,
          observation: occurrence.observation,
          location: occurrence.location,
          totalMembers,
          presentCount: records.filter(
            (record) => record.type === AttendanceType.PRESENT,
          ).length,
          absentCount: records.filter(
            (record) => record.type === AttendanceType.ABSENT,
          ).length,
          pendingCount: Math.max(0, totalMembers - records.length),
          attendanceRecords: records.map(toAttendanceRecordDto),
        };
      })
      .sort(byDateDesc);

    return {
      teamId: team.id,
      teamNumber: team.numberTeam,
      teamName: teamLabel(team.description, team.numberTeam),
      description: team.description,
      totalSchedules: teamSchedules.length,
      schedules: withAttendance,
    };
  }

  /** Registros agrupados por encontro (agendamento + categoria). */
  private countByOccurrence(
    attendances: readonly AttendanceEntity[],
  ): Map<string, AttendanceEntity[]> {
    const grouped = new Map<string, AttendanceEntity[]>();

    for (const record of attendances) {
      const key = `${record.shelterSchedule.id}:${record.category}`;
      grouped.set(key, [...(grouped.get(key) ?? []), record]);
    }

    return grouped;
  }
}
