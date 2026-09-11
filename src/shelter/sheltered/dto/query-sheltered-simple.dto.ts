import { Type } from "class-transformer";
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from "class-validator";
import { AcceptedJesusFilter } from "../enums/accepted-jesus-filter.enum";
import { ShelteredActiveFilter } from "../enums/sheltered-active-filter.enum";
import {
  SHELTERED_LIMIT_DEFAULT,
  SHELTERED_LIMIT_MAX,
  SHELTERED_PAGE_DEFAULT,
} from "../constants";

export class QueryShelteredSimpleDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = SHELTERED_PAGE_DEFAULT;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(SHELTERED_LIMIT_MAX)
  limit: number = SHELTERED_LIMIT_DEFAULT;

  /** Matches the shelter name, guardian name or guardian phone. */
  @IsOptional()
  @IsString()
  searchString?: string;

  @IsOptional()
  @IsEnum(AcceptedJesusFilter)
  acceptedJesus: AcceptedJesusFilter = AcceptedJesusFilter.ALL;

  @IsOptional()
  @IsEnum(ShelteredActiveFilter)
  active: ShelteredActiveFilter = ShelteredActiveFilter.ALL;
}
