import { IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { AttendanceType, AttendanceCategory } from '../entities/attendance.entity';

export class RegisterAttendanceDto {
  @IsUUID()
  @IsNotEmpty()
  scheduleId: string;

  @IsEnum(AttendanceType)
  @IsNotEmpty()
  type: AttendanceType;

  @IsEnum(AttendanceCategory)
  @IsOptional()
  category?: AttendanceCategory = AttendanceCategory.VISIT;

  @IsString()
  @IsOptional()
  @MaxLength(500, { message: 'Comentário deve ter no máximo 500 caracteres' })
  comment?: string; // Sempre opcional, independente do tipo de presença
}
