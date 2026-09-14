import { Injectable } from "@nestjs/common";
import { ResourceNotFoundException } from "src/common/exceptions";
import { AttendanceType } from "../entities/attendance.entity";
import { AttendanceRepository } from "../repositories/attendance.repository";
import { AttendanceScopeService } from "./attendance-scope.service";
import { AttendanceActor } from "../types";
import { AttendanceStatsDto } from "../dto/attendance-response.dto";
import { ATTENDANCE_MESSAGES } from "../constants";
import { memberUsersOf } from "../mappers/attendance.mapper";

interface StatsRange {
  teamId?: string;
  startDate?: string;
  endDate?: string;
}

@Injectable()
export class GetStatsService {
  constructor(
    private readonly repository: AttendanceRepository,
    private readonly scopeService: AttendanceScopeService,
  ) {}

  /** Números do próprio usuário: o que ele lançou e o que ficou pendente. */
  async forMember(
    actor: AttendanceActor,
    range: StatsRange,
  ): Promise<AttendanceStatsDto> {
    await this.scopeService.resolve(actor);

    const records = await this.repository.findRecordsOfMember(
      actor.userId,
      range,
    );
    const pastSchedules = await this.repository.findPastSchedulesOfUser(
      actor.userId,
      range,
      new Date(),
    );

    const presentCount = records.filter(
      (record) => record.type === AttendanceType.PRESENT,
    ).length;
    const totalEvents = new Set(
      records.map((record) => record.shelterSchedule.id),
    ).size;

    return {
      totalEvents,
      totalAttendanceRecords: records.length,
      presentCount,
      absentCount: records.length - presentCount,
      attendanceRate: this.rate(presentCount, records.length),
      pendingCount: Math.max(0, pastSchedules.length - records.length),
    };
  }

  /** Números de uma equipe inteira, para o líder. */
  async forTeam(
    actor: AttendanceActor,
    teamId: string,
    range: Omit<StatsRange, "teamId">,
  ): Promise<AttendanceStatsDto> {
    const scope = await this.scopeService.resolve(actor);
    this.scopeService.assertLeads(scope, teamId);

    const team = await this.repository.findTeamWithMembers(teamId);
    if (!team) {
      throw new ResourceNotFoundException(ATTENDANCE_MESSAGES.TEAM_NOT_FOUND);
    }

    const members = memberUsersOf(team);
    const records = await this.repository.findRecordsOfMembers(
      members.map((member) => member.id),
      teamId,
      range,
    );
    const totalEvents = await this.repository.countSchedulesOfTeam(
      teamId,
      range,
    );

    const presentCount = records.filter(
      (record) => record.type === AttendanceType.PRESENT,
    ).length;
    const expected = totalEvents * members.length;

    return {
      totalEvents,
      totalAttendanceRecords: records.length,
      presentCount,
      absentCount: records.length - presentCount,
      // Aqui a taxa é de cobertura: quanto do esperado foi lançado.
      attendanceRate: this.rate(records.length, expected),
      pendingCount: Math.max(0, expected - records.length),
    };
  }

  private rate(part: number, total: number): number {
    return total > 0 ? Math.round((part / total) * 100) : 0;
  }
}
