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
import {
  SCHEDULE_VARCHAR_MAX,
  isFilled,
  isProvided,
} from "../utils/schedule-dto.util";

export class UpdateShelterScheduleDto {
  @IsNumber()
  @IsOptional()
  @Min(1)
  visitNumber?: number;

  @ValidateIf(isFilled)
  @IsDateString()
  visitDate?: string;

  @ValidateIf(isFilled)
  @IsDateString()
  meetingDate?: string;

  // Coluna NOT NULL: omitir é "não mexer", mas `null` ou vazio é erro.
  @ValidateIf(isProvided)
  @IsString()
  @IsNotEmpty()
  lessonContent?: string;

  @IsOptional()
  @IsString()
  observation?: string;

  @IsOptional()
  @IsString()
  @MaxLength(SCHEDULE_VARCHAR_MAX)
  meetingRoom?: string;

  @IsUUID()
  @IsOptional()
  teamId?: string;
}
