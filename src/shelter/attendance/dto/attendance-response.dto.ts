import {
  AttendanceCategory,
  AttendanceType,
} from "../entities/attendance.entity";

/**
 * Respostas do módulo de frequência.
 *
 * O arquivo anterior tinha 494 linhas e decorava **saídas** com
 * `@IsUUID`, `@IsEnum` e `@IsDateString`. Validador em DTO de resposta não
 * roda: o `ValidationPipe` valida o que entra. Aqui ficam só os tipos; o que
 * entra está em `attendance-filters.dto.ts` e nos DTOs de registro.
 */

export class AttendanceResponseDto {
  id!: string;
  type!: AttendanceType;
  category!: AttendanceCategory;
  comment?: string;
  memberId!: string;
  memberName!: string;
  memberEmail!: string;
  scheduleId!: string;
  visitNumber!: number;
  visitDate?: string;
  meetingDate?: string;
  lessonContent?: string;
  observation?: string;
  meetingRoom?: string;
  teamName!: string;
  shelterName!: string;
  createdAt!: Date;
  updatedAt!: Date;
}

/** Alias de leitura: a listagem devolve o mesmo formato do registro. */
export type AttendanceRecordListItemDto = AttendanceResponseDto;

/** Registro enxuto, dentro de um encontro que já traz o contexto. */
export class AttendanceRecordDto {
  id!: string;
  type!: AttendanceType;
  category!: AttendanceCategory;
  comment?: string;
  memberId!: string;
  memberName!: string;
  memberEmail!: string;
  createdAt!: Date;
  updatedAt!: Date;
}

export class PendingMemberDto {
  memberId!: string;
  memberName!: string;
  memberEmail!: string;
  role!: string;
}

/** Encontro em que falta lançar a frequência de alguém. */
export class PendingForLeaderDto {
  scheduleId!: string;
  visitNumber!: number;
  category!: AttendanceCategory;
  date!: string;
  location!: string;
  lessonContent?: string;
  teamName!: string;
  shelterName!: string;
  pendingMembers!: PendingMemberDto[];
  totalMembers!: number;
}

/** Encontro em que a frequência do próprio usuário não foi lançada. */
export class PendingForMemberDto {
  scheduleId!: string;
  visitNumber!: number;
  category!: AttendanceCategory;
  date!: string;
  location!: string;
  teamNumber!: number;
  shelterName!: string;
  teamName!: string;
  lessonContent!: string;
  teamId!: string;
}

export class TeamPendingsDto {
  teamId!: string;
  teamName!: string;
  shelterName!: string;
  pendings!: PendingForLeaderDto[];
}

export class VisitReportPendingDto {
  scheduleId!: string;
  visitNumber!: number;
  visitDate!: string;
  visitDateFormatted!: string;
  summary!: string;
  lessonContent?: string;
  observation?: string;
  teamId!: string;
  teamNumber!: number;
  teamName!: string;
  shelterName!: string;
  shelterAddress?: string;
}

export class TeamVisitReportPendingsDto {
  teamId!: string;
  teamName!: string;
  shelterName!: string;
  pendings!: VisitReportPendingDto[];
}

export class AllPendingsResponseDto {
  leaderPendings!: TeamPendingsDto[];
  memberPendings!: PendingForMemberDto[];
  visitReportPendings!: TeamVisitReportPendingsDto[];
}

export class TeamMemberDto {
  id!: string;
  name!: string;
  email!: string;
  role!: string;
}

export class TeamMembersDto {
  teamId!: string;
  teamNumber!: number;
  shelterName!: string;
  members!: TeamMemberDto[];
}

export class LeaderTeamDto {
  teamId!: string;
  teamNumber!: number;
  shelterId!: string;
  shelterName!: string;
  description?: string;
  memberCount!: number;
}

export class ShelterTeamDto {
  teamId!: string;
  teamNumber!: number;
  description?: string;
  memberCount!: number;
  members!: TeamMemberDto[];
}

export class ShelterTeamsMembersDto {
  shelterId!: string;
  shelterName!: string;
  teams!: ShelterTeamDto[];
}

/** Um encontro da equipe, com quantos já foram lançados. */
export class TeamScheduleDto {
  id!: string;
  category!: AttendanceCategory;
  date!: string;
  visitNumber!: number;
  lessonContent?: string;
  observation?: string;
  location!: string;
  teamId!: string;
  teamNumber!: number;
  teamName!: string;
  shelterName!: string;
  attendanceCount!: number;
  totalMembers!: number;
}

export class ScheduleWithAttendanceDto {
  scheduleId!: string;
  category!: AttendanceCategory;
  date!: string;
  visitNumber!: number;
  lessonContent?: string;
  observation?: string;
  location!: string;
  totalMembers!: number;
  presentCount!: number;
  absentCount!: number;
  pendingCount!: number;
  attendanceRecords!: AttendanceRecordDto[];
}

export class TeamWithSchedulesDto {
  teamId!: string;
  teamNumber!: number;
  teamName!: string;
  description?: string;
  totalSchedules!: number;
  schedules!: ScheduleWithAttendanceDto[];
}

export class ShelterWithTeamsDto {
  shelterId!: string;
  shelterName!: string;
  totalTeams!: number;
  teams!: TeamWithSchedulesDto[];
}

export class AttendanceStatsDto {
  totalEvents!: number;
  totalAttendanceRecords!: number;
  presentCount!: number;
  absentCount!: number;
  attendanceRate!: number;
  pendingCount!: number;
}

/**
 * Envelope paginado deste módulo. Difere do `PaginatedResponseDto`
 * compartilhado (`meta.totalItems`/`totalPages`) porque este é o contrato que
 * o frontend já consome; a convergência está registrada como débito.
 */
export class PaginatedResponseDto<TItem> {
  data!: TItem[];
  meta!: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}
