import { IsNotEmpty, IsOptional, IsUUID, IsNumber, Min } from 'class-validator';

export class CreateShelterScheduleDto {
  @IsNumber()
  @IsNotEmpty()
  @Min(1)
  visitNumber!: number;

  @IsOptional()
  visitDate?: string;

  @IsOptional()
  meetingDate?: string;

  @IsNotEmpty()
  lessonContent!: string;

  @IsOptional()
  observation?: string;

  @IsOptional()
  meetingRoom?: string;

  @IsUUID()
  @IsNotEmpty()
  teamId!: string;
}
