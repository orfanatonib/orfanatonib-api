import { Type } from "class-transformer";
import {
  IsDateString,
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from "class-validator";

import {
  ATTENDANCE_LIMIT_DEFAULT,
  ATTENDANCE_LIMIT_MAX,
  ATTENDANCE_PAGE_DEFAULT,
} from "../constants";
import {
  AttendanceCategory,
  AttendanceType,
} from "../entities/attendance.entity";

/** Filtros da listagem de lançamentos e do período das estatísticas. */
export class AttendanceFiltersDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = ATTENDANCE_PAGE_DEFAULT;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(ATTENDANCE_LIMIT_MAX)
  limit?: number = ATTENDANCE_LIMIT_DEFAULT;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsEnum(AttendanceType)
  type?: AttendanceType;

  @IsOptional()
  @IsEnum(AttendanceCategory)
  category?: AttendanceCategory;

  @IsOptional()
  @IsUUID()
  teamId?: string;

  @IsOptional()
  @IsUUID()
  memberId?: string;

  @IsOptional()
  @IsUUID()
  scheduleId?: string;

  @IsOptional()
  @IsString()
  memberName?: string;

  @IsOptional()
  @IsIn(["asc", "desc", "ASC", "DESC"])
  sortOrder?: string = "desc";

  @IsOptional()
  @IsIn(["createdAt", "visitDate", "meetingDate"])
  sortBy?: string = "createdAt";
}

/** Recorte por período, usado pelas estatísticas e pelas folhas. */
export class AttendancePeriodDto {
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;
}
