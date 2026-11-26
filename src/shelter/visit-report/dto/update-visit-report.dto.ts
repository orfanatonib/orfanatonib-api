import {
  IsOptional,
  IsInt,
  Min,
  Max,
  MaxLength,
  IsString,
} from "class-validator";
import { VISIT_REPORT_LIMITS } from "../constants";

export class UpdateVisitReportDto {
  @IsInt()
  @IsOptional()
  @Min(0)
  @Max(VISIT_REPORT_LIMITS.countMax)
  teamMembersPresent?: number;

  @IsInt()
  @IsOptional()
  @Min(0)
  @Max(VISIT_REPORT_LIMITS.countMax)
  shelteredHeardMessage?: number;

  @IsInt()
  @IsOptional()
  @Min(0)
  @Max(VISIT_REPORT_LIMITS.countMax)
  caretakersHeardMessage?: number;

  @IsInt()
  @IsOptional()
  @Min(0)
  @Max(VISIT_REPORT_LIMITS.countMax)
  shelteredDecisions?: number;

  @IsInt()
  @IsOptional()
  @Min(0)
  @Max(VISIT_REPORT_LIMITS.countMax)
  caretakersDecisions?: number;

  @IsString()
  @IsOptional()
  @MaxLength(VISIT_REPORT_LIMITS.observationMax)
  observation?: string;
}
