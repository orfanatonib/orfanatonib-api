import { IsArray, IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID, ValidateNested, MaxLength, ArrayMinSize } from 'class-validator';
import { Type } from 'class-transformer';
import { AttendanceType, AttendanceCategory } from '../entities/attendance.entity';

export class MemberAttendanceDto {
  @IsUUID()
  @IsNotEmpty()
  memberId: string;

  @IsEnum(AttendanceType)
  @IsNotEmpty()
  type: AttendanceType;

  @IsString()
  @IsOptional()
  @MaxLength(500, { message: 'Comentário deve ter no máximo 500 caracteres' })
  comment?: string; // Sempre opcional, independente do tipo de presença
}

export class RegisterTeamAttendanceDto {
  @IsUUID()
  @IsNotEmpty()
  teamId: string;

  @IsUUID()
  @IsNotEmpty()
  scheduleId: string;

  @IsEnum(AttendanceCategory)
  @IsOptional()
  category?: AttendanceCategory = AttendanceCategory.VISIT;

  @IsArray()
  @ArrayMinSize(1, { message: 'Deve haver pelo menos um registro de presença' })
  @ValidateNested({ each: true })
  @Type(() => MemberAttendanceDto)
  attendances: MemberAttendanceDto[];
}
