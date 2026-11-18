import { IsDateString, IsEnum, IsOptional } from "class-validator";

import { ContentAudience } from "../enums/content-audience.enum";

export class QueryContentStudioDashboardDto {
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsEnum(ContentAudience)
  audience?: ContentAudience;
}
