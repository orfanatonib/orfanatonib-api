import { IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { AttendanceType } from '../entities/attendance.entity';

export class RegisterAttendanceDto {
  @IsUUID()
  @IsNotEmpty()
  scheduleId: string;

  @IsEnum(AttendanceType)
  @IsNotEmpty()
  type: AttendanceType;

  @IsString()
  @IsOptional()
  @MaxLength(500, { message: 'Comentário deve ter no máximo 500 caracteres' })
  comment?: string; // Sempre opcional, independente do tipo de presença
}
