import { IsDateString, IsEnum, IsNumber, IsOptional, IsString, IsUUID, Min, Max, IsIn } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { AttendanceType, AttendanceCategory } from '../entities/attendance.entity';

export class AttendanceResponseDto {
  @IsUUID()
  id: string;

  @IsEnum(AttendanceType)
  type: AttendanceType;

  @IsEnum(AttendanceCategory)
  category: AttendanceCategory;

  @IsString()
  @IsOptional()
  comment?: string;

  @IsUUID()
  memberId: string;

  @IsString()
  memberName: string;

  @IsString()
  @IsOptional()
  memberEmail?: string;

  @IsUUID()
  scheduleId: string;

  @IsNumber()
  visitNumber: number;

  @IsDateString()
  @IsOptional()
  visitDate?: string;

  @IsDateString()
  @IsOptional()
  meetingDate?: string;

  @IsString()
  @IsOptional()
  lessonContent?: string;

  @IsString()
  @IsOptional()
  observation?: string;

  @IsString()
  @IsOptional()
  meetingRoom?: string;

  @IsString()
  teamName: string;

  @IsString()
  shelterName: string;

  @IsDateString()
  createdAt: Date;

  @IsDateString()
  updatedAt: Date;
}

export class PendingMemberDto {
  memberId: string;
  memberName: string;
  memberEmail: string;
  role: 'leader' | 'member';
}

export class PendingForLeaderDto {
  @IsUUID()
  scheduleId: string;

  @IsNumber()
  visitNumber: number;

  @IsEnum(AttendanceCategory)
  category: AttendanceCategory;

  @IsDateString()
  date: string;

  @IsString()
  lessonContent: string;

  @IsString()
  @IsOptional()
  observation?: string;

  @IsString()
  @IsOptional()
  location?: string;

  @IsString()
  teamName: string;

  @IsString()
  shelterName: string;

  @IsNumber()
  totalMembers: number;

  pendingMembers: PendingMemberDto[];
}

export class PendingForMemberDto {
  @IsUUID()
  scheduleId: string;

  @IsNumber()
  visitNumber: number;

  @IsEnum(AttendanceCategory)
  category: AttendanceCategory;

  @IsDateString()
  date: string;

  @IsString()
  lessonContent: string;

  @IsString()
  @IsOptional()
  observation?: string;

  @IsString()
  @IsOptional()
  location?: string;

  @IsUUID()
  teamId: string;

  @IsNumber()
  teamNumber: number;

  @IsString()
  teamName: string;

  @IsString()
  shelterName: string;
}

export class PaginationDto {
  @IsNumber()
  @Min(1)
  @IsOptional()
  @Type(() => Number)
  page?: number = 1;

  @IsNumber()
  @Min(1)
  @Max(100)
  @IsOptional()
  @Type(() => Number)
  limit?: number = 20;
}

export class AttendanceFiltersDto extends PaginationDto {
  @IsDateString()
  @IsOptional()
  startDate?: string;

  @IsDateString()
  @IsOptional()
  endDate?: string;

  @IsEnum(AttendanceType)
  @IsOptional()
  type?: AttendanceType;

  @IsEnum(AttendanceCategory)
  @IsOptional()
  category?: AttendanceCategory;

  @IsUUID()
  @IsOptional()
  teamId?: string;

  @IsUUID()
  @IsOptional()
  memberId?: string;

  @IsUUID()
  @IsOptional()
  scheduleId?: string;

  @IsString()
  @IsOptional()
  memberName?: string;

  @IsIn(['asc', 'desc'])
  @IsOptional()
  sortOrder?: 'asc' | 'desc' = 'desc';

  @IsIn(['createdAt', 'visitDate', 'meetingDate'])
  @IsOptional()
  sortBy?: 'createdAt' | 'visitDate' | 'meetingDate' = 'createdAt';
}

export class AttendanceStatsDto {
  @IsNumber()
  totalEvents: number;

  @IsNumber()
  totalAttendanceRecords: number;

  @IsNumber()
  presentCount: number;

  @IsNumber()
  absentCount: number;

  @IsNumber()
  attendanceRate: number;

  @IsNumber()
  pendingCount: number;
}

export class TeamMemberDto {
  @IsUUID()
  id: string;

  @IsString()
  name: string;

  @IsString()
  email: string;

  @IsIn(['leader', 'member'])
  @IsOptional()
  role: 'leader' | 'member';
}

export class TeamScheduleDto {
  @IsUUID()
  id: string;

  @IsNumber()
  visitNumber: number;

  @IsEnum(AttendanceCategory)
  category: AttendanceCategory;

  @IsDateString()
  date: string;

  @IsString()
  lessonContent: string;

  @IsString()
  @IsOptional()
  observation?: string;

  @IsString()
  @IsOptional()
  location?: string;

  @IsUUID()
  teamId: string;

  @IsNumber()
  teamNumber: number;

  @IsString()
  teamName: string;

  @IsString()
  shelterName: string;

  @IsNumber()
  @IsOptional()
  attendanceCount?: number;

  @IsNumber()
  @IsOptional()
  totalMembers?: number;
}

export class LeaderTeamDto {
  @IsUUID()
  teamId: string;

  @IsNumber()
  teamNumber: number;

  @IsUUID()
  shelterId: string;

  @IsString()
  shelterName: string;

  @IsString()
  description: string;

  @IsNumber()
  @IsOptional()
  memberCount?: number;
}

export class PaginatedResponseDto<T> {
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export class AttendanceRecordDto {
  @IsUUID()
  id: string;

  @IsEnum(AttendanceType)
  type: AttendanceType;

  @IsEnum(AttendanceCategory)
  category: AttendanceCategory;

  @IsString()
  @IsOptional()
  comment?: string;

  @IsUUID()
  memberId: string;

  @IsString()
  memberName: string;

  @IsString()
  @IsOptional()
  memberEmail?: string;

  @IsDateString()
  createdAt: Date;

  @IsDateString()
  updatedAt: Date;
}

export class ScheduleWithAttendanceDto {
  @IsUUID()
  scheduleId: string;

  @IsNumber()
  visitNumber: number;

  @IsEnum(AttendanceCategory)
  category: AttendanceCategory;

  @IsDateString()
  date: string;

  @IsString()
  lessonContent: string;

  @IsString()
  @IsOptional()
  observation?: string;

  @IsString()
  @IsOptional()
  @IsString()
  @IsOptional()
  location?: string;


  @IsNumber()
  totalMembers: number;

  @IsNumber()
  presentCount: number;

  @IsNumber()
  absentCount: number;

  @IsNumber()
  pendingCount: number;

  attendanceRecords: AttendanceRecordDto[];
}

export class TeamWithSchedulesDto {
  @IsUUID()
  teamId: string;

  @IsNumber()
  teamNumber: number;

  @IsString()
  teamName: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsNumber()
  totalSchedules: number;

  schedules: ScheduleWithAttendanceDto[];
}

export class ShelterWithTeamsDto {
  @IsUUID()
  shelterId: string;

  @IsString()
  shelterName: string;

  @IsNumber()
  totalTeams: number;

  teams: TeamWithSchedulesDto[];
}
