import { Type } from "class-transformer";
import { IsInt, IsOptional, Max, Min } from "class-validator";

import { AI_USAGE_MAX_DAYS } from "../constants";

export class AiUsageQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(AI_USAGE_MAX_DAYS)
  days?: number;
}
