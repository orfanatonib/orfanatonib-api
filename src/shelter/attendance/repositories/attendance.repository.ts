import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, Repository } from "typeorm";

import { ShelterScheduleEntity } from "src/shelter/schedule/entities/shelter-schedule.entity";
import { TeamEntity } from "src/shelter/team/entities/team.entity";
import { UserEntity } from "src/core/user/entities/user.entity";
import { VisitReportEntity } from "src/shelter/visit-report/entities/visit-report.entity";

import {
  AttendanceCategory,
  AttendanceEntity,
} from "../entities/attendance.entity";
import {
  ATTENDANCE_SORT_COLUMNS,
  ATTENDANCE_LIMIT_DEFAULT,
} from "../constants";
import { AttendanceBatchEntry, AttendanceRecordsFilters } from "../types";
import { isoDay } from "../utils/attendance-occurrence.util";

const TEAM_WITH_MEMBERS = ["shelter", "members", "members.user"];

@Injectable()
export class AttendanceRepository {
  constructor(
    @InjectRepository(AttendanceEntity)
    private readonly attendanceRepo: Repository<AttendanceEntity>,
    @InjectRepository(ShelterScheduleEntity)
    private readonly scheduleRepo: Repository<ShelterScheduleEntity>,
    @InjectRepository(TeamEntity)
    private readonly teamRepo: Repository<TeamEntity>,
    @InjectRepository(UserEntity)
    private readonly userRepo: Repository<UserEntity>,
    @InjectRepository(VisitReportEntity)
    private readonly visitReportRepo: Repository<VisitReportEntity>,
  ) {}

  /** All writes use the transaction repository; failure rolls back the entire sheet. */
  async saveBatch(
    entries: AttendanceBatchEntry[],
  ): Promise<AttendanceEntity[]> {
    return this.attendanceRepo.manager.transaction(async (manager) => {
      const repository = manager.getRepository(AttendanceEntity);
      const saved: AttendanceEntity[] = [];
      for (const entry of entries) {
        const existing = await repository.findOne({
          where: {
            member: { id: entry.member.id },
            shelterSchedule: { id: entry.schedule.id },
            category: entry.category,
          },
        });
        const entity = existing ?? repository.create();
        entity.member = entry.member;
        entity.shelterSchedule = entry.schedule;
        entity.category = entry.category;
        entity.type = entry.type;
        if (entry.comment !== undefined) entity.comment = entry.comment;
        saved.push(await repository.save(entity));
      }
      return saved;
    });
  }

  // ------------------------------------------------------------- usuário

  findUserWithMembership(userId: string): Promise<UserEntity | null> {
    return this.userRepo.findOne({
      where: { id: userId },
      relations: [
        "leaderProfile",
        "leaderProfile.teams",
        "leaderProfile.teams.shelter",
        "memberProfile",
        "memberProfile.team",
        "memberProfile.team.shelter",
      ],
    });
  }

  private async teamIdsByRelation(
    relation: "leaders" | "members",
    userId: string,
  ): Promise<string[]> {
    const rows = await this.teamRepo
      .createQueryBuilder("team")
      .leftJoin(`team.${relation}`, "profile")
      .leftJoin("profile.user", "profileUser")
      .where("profileUser.id = :userId", { userId })
      .select("team.id", "teamId")
      .getRawMany<{ teamId: string }>();

    return rows.map((row) => row.teamId);
  }

  findLeaderTeamIds(userId: string): Promise<string[]> {
    return this.teamIdsByRelation("leaders", userId);
  }

  findMemberTeamIds(userId: string): Promise<string[]> {
    return this.teamIdsByRelation("members", userId);
  }

  // ------------------------------------------------------------- equipes

  findTeamsWithMembers(teamIds?: readonly string[]): Promise<TeamEntity[]> {
    return this.teamRepo.find({
      ...(teamIds ? { where: { id: In([...teamIds]) } } : {}),
      relations: TEAM_WITH_MEMBERS,
      order: { numberTeam: "ASC" },
    });
  }

  findTeamWithMembers(teamId: string): Promise<TeamEntity | null> {
    return this.teamRepo.findOne({
      where: { id: teamId },
      relations: TEAM_WITH_MEMBERS,
    });
  }

  // --------------------------------------------------------- agendamentos

  /**
   * Agendamentos de várias equipes em **uma** consulta.
   *
   * Antes cada equipe disparava a sua, dentro de um laço — com admin, que
   * enxerga todas, isso era uma consulta por equipe a cada carregamento.
   */
  findSchedulesForTeams(
    teamIds: readonly string[],
    range: { before?: Date; startDate?: string; endDate?: string } = {},
  ): Promise<ShelterScheduleEntity[]> {
    if (teamIds.length === 0) return Promise.resolve([]);

    const query = this.scheduleRepo
      .createQueryBuilder("schedule")
      .leftJoinAndSelect("schedule.team", "team")
      .leftJoinAndSelect("team.shelter", "shelter")
      .leftJoinAndSelect("shelter.address", "address")
      .where("schedule.team.id IN (:...teamIds)", { teamIds: [...teamIds] });

    if (range.before) {
      query.andWhere(
        "(schedule.visitDate < :before OR schedule.meetingDate < :before)",
        { before: isoDay(range.before) },
      );
    }
    if (range.startDate) {
      query.andWhere(
        "(schedule.visitDate >= :startDate OR schedule.meetingDate >= :startDate)",
        { startDate: range.startDate },
      );
    }
    if (range.endDate) {
      query.andWhere(
        "(schedule.visitDate <= :endDate OR schedule.meetingDate <= :endDate)",
        { endDate: range.endDate },
      );
    }

    return query
      .orderBy("COALESCE(schedule.visitDate, schedule.meetingDate)", "DESC")
      .getMany();
  }

  findScheduleWithTeam(
    scheduleId: string,
  ): Promise<ShelterScheduleEntity | null> {
    return this.scheduleRepo.findOne({
      where: { id: scheduleId },
      relations: ["team", "team.shelter"],
    });
  }

  countSchedulesOfTeam(
    teamId: string,
    range: { startDate?: string; endDate?: string },
  ): Promise<number> {
    const query = this.scheduleRepo
      .createQueryBuilder("schedule")
      .where("schedule.team.id = :teamId", { teamId });

    if (range.startDate) {
      query.andWhere(
        "(schedule.visitDate >= :startDate OR schedule.meetingDate >= :startDate)",
        { startDate: range.startDate },
      );
    }
    if (range.endDate) {
      query.andWhere(
        "(schedule.visitDate <= :endDate OR schedule.meetingDate <= :endDate)",
        { endDate: range.endDate },
      );
    }

    return query.getCount();
  }

  // ----------------------------------------------------------- frequência

  /** Todos os registros de um conjunto de agendamentos, numa consulta só. */
  findAttendancesForSchedules(
    scheduleIds: readonly string[],
  ): Promise<AttendanceEntity[]> {
    if (scheduleIds.length === 0) return Promise.resolve([]);

    return this.attendanceRepo.find({
      where: { shelterSchedule: { id: In([...scheduleIds]) } },
      relations: ["member", "shelterSchedule"],
    });
  }

  findOneAttendance(
    memberId: string,
    scheduleId: string,
    category: AttendanceCategory,
  ): Promise<AttendanceEntity | null> {
    return this.attendanceRepo.findOne({
      where: {
        member: { id: memberId },
        shelterSchedule: { id: scheduleId },
        category,
      },
      relations: ["member", "shelterSchedule", "shelterSchedule.team"],
    });
  }

  create(data: Partial<AttendanceEntity>): AttendanceEntity {
    return this.attendanceRepo.create(data);
  }

  save(attendance: AttendanceEntity): Promise<AttendanceEntity> {
    return this.attendanceRepo.save(attendance);
  }

  /** Página de registros, com os filtros da tela. */
  async findRecordsPaginated(
    filters: AttendanceRecordsFilters,
    teamIds?: readonly string[],
  ): Promise<{ items: AttendanceEntity[]; total: number }> {
    const query = this.attendanceRepo
      .createQueryBuilder("attendance")
      .leftJoinAndSelect("attendance.member", "member")
      .leftJoinAndSelect("attendance.shelterSchedule", "schedule")
      .leftJoinAndSelect("schedule.team", "team")
      .leftJoinAndSelect("team.shelter", "shelter");

    if (teamIds) {
      query.andWhere("schedule.team.id IN (:...teamIds)", {
        teamIds: [...teamIds],
      });
    }
    if (filters.category) {
      query.andWhere("attendance.category = :category", {
        category: filters.category,
      });
    }
    if (filters.type) {
      query.andWhere("attendance.type = :type", { type: filters.type });
    }
    if (filters.teamId) {
      query.andWhere("schedule.team.id = :teamId", { teamId: filters.teamId });
    }
    if (filters.memberId) {
      query.andWhere("attendance.member.id = :memberId", {
        memberId: filters.memberId,
      });
    }
    if (filters.scheduleId) {
      query.andWhere("schedule.id = :scheduleId", {
        scheduleId: filters.scheduleId,
      });
    }
    if (filters.memberName) {
      query.andWhere("LOWER(member.name) LIKE LOWER(:memberName)", {
        memberName: `%${filters.memberName}%`,
      });
    }
    if (filters.startDate) {
      query.andWhere(
        "(schedule.visitDate >= :startDate OR schedule.meetingDate >= :startDate)",
        { startDate: filters.startDate },
      );
    }
    if (filters.endDate) {
      query.andWhere(
        "(schedule.visitDate <= :endDate OR schedule.meetingDate <= :endDate)",
        { endDate: filters.endDate },
      );
    }

    const limit = filters.limit || ATTENDANCE_LIMIT_DEFAULT;
    const [items, total] = await query
      .orderBy(ATTENDANCE_SORT_COLUMNS[filters.sortBy], filters.sortOrder)
      .skip((filters.page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return { items, total };
  }

  /** Registros do próprio usuário, para as estatísticas pessoais. */
  findRecordsOfMember(
    memberId: string,
    range: { teamId?: string; startDate?: string; endDate?: string },
  ): Promise<AttendanceEntity[]> {
    const query = this.attendanceRepo
      .createQueryBuilder("attendance")
      .leftJoinAndSelect("attendance.shelterSchedule", "schedule")
      .where("attendance.member.id = :memberId", { memberId });

    if (range.teamId) {
      query.andWhere("schedule.team.id = :teamId", { teamId: range.teamId });
    }
    if (range.startDate) {
      query.andWhere(
        "(schedule.visitDate >= :startDate OR schedule.meetingDate >= :startDate)",
        { startDate: range.startDate },
      );
    }
    if (range.endDate) {
      query.andWhere(
        "(schedule.visitDate <= :endDate OR schedule.meetingDate <= :endDate)",
        { endDate: range.endDate },
      );
    }

    return query.getMany();
  }

  findRecordsOfMembers(
    memberIds: readonly string[],
    teamId: string,
    range: { startDate?: string; endDate?: string },
  ): Promise<AttendanceEntity[]> {
    if (memberIds.length === 0) return Promise.resolve([]);

    const query = this.attendanceRepo
      .createQueryBuilder("attendance")
      .leftJoinAndSelect("attendance.shelterSchedule", "schedule")
      .where("attendance.member.id IN (:...memberIds)", {
        memberIds: [...memberIds],
      })
      .andWhere("schedule.team.id = :teamId", { teamId });

    if (range.startDate) {
      query.andWhere(
        "(schedule.visitDate >= :startDate OR schedule.meetingDate >= :startDate)",
        { startDate: range.startDate },
      );
    }
    if (range.endDate) {
      query.andWhere(
        "(schedule.visitDate <= :endDate OR schedule.meetingDate <= :endDate)",
        { endDate: range.endDate },
      );
    }

    return query.getMany();
  }

  /** Agendamentos passados do usuário, base do total de pendências. */
  findPastSchedulesOfUser(
    userId: string,
    range: { teamId?: string; startDate?: string; endDate?: string },
    today: Date,
  ): Promise<ShelterScheduleEntity[]> {
    const query = this.scheduleRepo
      .createQueryBuilder("schedule")
      .leftJoin("schedule.team", "team")
      .leftJoin("team.leaders", "leader")
      .leftJoin("leader.user", "leaderUser")
      .leftJoin("team.members", "member")
      .leftJoin("member.user", "memberUser")
      .where("(leaderUser.id = :userId OR memberUser.id = :userId)", { userId })
      .andWhere(
        "(schedule.visitDate < :today OR schedule.meetingDate < :today)",
        { today: isoDay(today) },
      );

    if (range.teamId) {
      query.andWhere("schedule.team.id = :teamId", { teamId: range.teamId });
    }
    if (range.startDate) {
      query.andWhere(
        "(schedule.visitDate >= :startDate OR schedule.meetingDate >= :startDate)",
        { startDate: range.startDate },
      );
    }
    if (range.endDate) {
      query.andWhere(
        "(schedule.visitDate <= :endDate OR schedule.meetingDate <= :endDate)",
        { endDate: range.endDate },
      );
    }

    return query.getMany();
  }

  /** Ids dos agendamentos que já têm relatório de visita. */
  async findScheduleIdsWithReport(
    scheduleIds: readonly string[],
  ): Promise<Set<string>> {
    if (scheduleIds.length === 0) return new Set();

    const reports = await this.visitReportRepo.find({
      where: { schedule: { id: In([...scheduleIds]) } },
      relations: ["schedule"],
    });

    return new Set(reports.map((report) => report.schedule.id));
  }
}
