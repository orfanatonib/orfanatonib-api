import { Injectable, Logger } from "@nestjs/common";
import {
  AccessDeniedException,
  ResourceNotFoundException,
  RuleException,
} from "src/common/exceptions";
import { ShelterScheduleEntity } from "src/shelter/schedule/entities/shelter-schedule.entity";
import { UserEntity } from "src/core/user/entities/user.entity";
import {
  AttendanceCategory,
  AttendanceEntity,
  AttendanceType,
} from "../entities/attendance.entity";
import { AttendanceRepository } from "../repositories/attendance.repository";
import { AttendanceScopeService } from "./attendance-scope.service";
import { AttendanceActor } from "../types";
import { RegisterAttendanceDto } from "../dto/register-attendance.dto";
import { RegisterTeamAttendanceDto } from "../dto/register-team-attendance.dto";
import { AttendanceResponseDto } from "../dto/attendance-response.dto";
import {
  ATTENDANCE_DEFAULT_CATEGORY,
  ATTENDANCE_MESSAGES,
  AttendanceLogs,
} from "../constants";
import {
  memberUsersOf,
  toAttendanceResponseDto,
} from "../mappers/attendance.mapper";

@Injectable()
export class RegisterAttendanceService {
  private readonly logger = new Logger(RegisterAttendanceService.name);

  constructor(
    private readonly repository: AttendanceRepository,
    private readonly scopeService: AttendanceScopeService,
  ) {}

  /** O próprio usuário lança a sua presença num encontro da equipe dele. */
  async registerOwn(
    actor: AttendanceActor,
    dto: RegisterAttendanceDto,
  ): Promise<AttendanceResponseDto> {
    const schedule = await this.findScheduleOrFail(dto.scheduleId);
    const scope = await this.scopeService.resolve(actor);
    this.scopeService.assertBelongs(scope, schedule.team.id);

    const category = dto.category ?? ATTENDANCE_DEFAULT_CATEGORY;
    const saved = await this.upsert(
      scope.user,
      schedule,
      category,
      dto.type,
      dto.comment,
    );

    this.logger.log(AttendanceLogs.REGISTERED(actor.userId, category));
    return toAttendanceResponseDto(saved);
  }

  /** O líder lança a frequência de vários membros de uma vez. */
  async registerTeam(
    actor: AttendanceActor,
    dto: RegisterTeamAttendanceDto,
  ): Promise<AttendanceResponseDto[]> {
    const scope = await this.scopeService.resolve(actor);
    this.scopeService.assertLeads(scope, dto.teamId);

    const schedule = await this.findScheduleOrFail(dto.scheduleId);
    if (schedule.team.id !== dto.teamId) {
      throw new AccessDeniedException(ATTENDANCE_MESSAGES.SCHEDULE_OTHER_TEAM);
    }

    const team = await this.repository.findTeamWithMembers(dto.teamId);
    if (!team) {
      throw new ResourceNotFoundException(ATTENDANCE_MESSAGES.TEAM_NOT_FOUND);
    }

    const membersById = new Map(
      memberUsersOf(team).map((user) => [user.id, user]),
    );
    const category = dto.category ?? ATTENDANCE_DEFAULT_CATEGORY;
    const saved: AttendanceEntity[] = [];

    for (const entry of dto.attendances) {
      const member = membersById.get(entry.memberId);
      if (!member) {
        throw new RuleException(
          ATTENDANCE_MESSAGES.MEMBER_NOT_IN_TEAM(entry.memberId),
        );
      }

      saved.push(
        await this.upsert(
          member,
          schedule,
          category,
          entry.type,
          entry.comment,
        ),
      );
    }

    this.logger.log(AttendanceLogs.TEAM_REGISTERED(dto.teamId, saved.length));
    return saved.map(toAttendanceResponseDto);
  }

  /**
   * Um registro por membro, encontro e categoria: relançar corrige o que já
   * existe em vez de duplicar.
   */
  private async upsert(
    member: UserEntity,
    schedule: ShelterScheduleEntity,
    category: AttendanceCategory,
    type: AttendanceType,
    comment: string | undefined,
  ): Promise<AttendanceEntity> {
    const existing = await this.repository.findOneAttendance(
      member.id,
      schedule.id,
      category,
    );

    // O membro entra inteiro, e não só pelo id: a resposta declara nome e
    // e-mail, e sem isso seria preciso reler o registro logo após gravá-lo.
    if (existing) {
      existing.type = type;
      existing.comment = comment;
      existing.shelterSchedule = schedule;
      existing.member = member;
      return this.repository.save(existing);
    }

    return this.repository.save(
      this.repository.create({
        member,
        shelterSchedule: schedule,
        type,
        comment,
        category,
      }),
    );
  }

  private async findScheduleOrFail(
    scheduleId: string,
  ): Promise<ShelterScheduleEntity> {
    const schedule = await this.repository.findScheduleWithTeam(scheduleId);
    if (!schedule) {
      throw new ResourceNotFoundException(
        ATTENDANCE_MESSAGES.SCHEDULE_NOT_FOUND,
      );
    }
    if (!schedule.visitDate && !schedule.meetingDate) {
      throw new RuleException(ATTENDANCE_MESSAGES.SCHEDULE_WITHOUT_DATE);
    }
    return schedule;
  }
}
