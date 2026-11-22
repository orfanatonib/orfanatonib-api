import {
  IsDateString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  ValidateIf,
} from "class-validator";
import { SCHEDULE_VARCHAR_MAX, isFilled } from "../utils/schedule-dto.util";

export class CreateShelterScheduleDto {
  @IsNumber()
  @IsNotEmpty()
  @Min(1)
  visitNumber!: number;

  @ValidateIf(isFilled)
  @IsDateString()
  visitDate?: string;

  @ValidateIf(isFilled)
  @IsDateString()
  meetingDate?: string;

  @IsString()
  @IsNotEmpty()
  lessonContent!: string;

  @IsOptional()
  @IsString()
  observation?: string;

  @IsOptional()
  @IsString()
  @MaxLength(SCHEDULE_VARCHAR_MAX)
  meetingRoom?: string;

  @IsUUID()
  @IsNotEmpty()
  teamId!: string;
}
