import {
  IsNotEmpty,
  IsUUID,
  IsInt,
  Min,
  Max,
  MaxLength,
  IsString,
  IsOptional,
} from "class-validator";
import { VISIT_REPORT_LIMITS } from "../constants";

export class CreateVisitReportDto {
  @IsInt()
  @IsNotEmpty()
  @Min(0)
  @Max(VISIT_REPORT_LIMITS.countMax)
  teamMembersPresent!: number;

  @IsInt()
  @IsNotEmpty()
  @Min(0)
  @Max(VISIT_REPORT_LIMITS.countMax)
  shelteredHeardMessage!: number;

  @IsInt()
  @IsNotEmpty()
  @Min(0)
  @Max(VISIT_REPORT_LIMITS.countMax)
  caretakersHeardMessage!: number;

  @IsInt()
  @IsNotEmpty()
  @Min(0)
  @Max(VISIT_REPORT_LIMITS.countMax)
  shelteredDecisions!: number;

  @IsInt()
  @IsNotEmpty()
  @Min(0)
  @Max(VISIT_REPORT_LIMITS.countMax)
  caretakersDecisions!: number;

  @IsString()
  @IsOptional()
  @MaxLength(VISIT_REPORT_LIMITS.observationMax)
  observation?: string;

  @IsUUID()
  @IsNotEmpty()
  scheduleId!: string;
}
