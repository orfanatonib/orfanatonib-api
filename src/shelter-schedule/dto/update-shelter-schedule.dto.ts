import { IsOptional, IsUUID, IsNumber, Min } from 'class-validator';

export class UpdateShelterScheduleDto {
  @IsNumber()
  @IsOptional()
  @Min(1)
  visitNumber?: number;

  @IsOptional()
  visitDate?: string;

  @IsOptional()
  meetingDate?: string;

  @IsOptional()
  lessonContent?: string;

  @IsOptional()
  observation?: string;

  @IsOptional()
  meetingRoom?: string;

  @IsUUID()
  @IsOptional()
  teamId?: string;
}
