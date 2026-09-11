import { Type } from "class-transformer";
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from "class-validator";
import { SortOrder } from "src/shared/enums/sort-order.enum";
import { ShelteredGender } from "../enums/sheltered-gender.enum";
import { ShelteredOrderBy } from "../enums/sheltered-order-by.enum";
import {
  SHELTERED_LIMIT_DEFAULT,
  SHELTERED_LIMIT_MAX,
  SHELTERED_ORDER_BY_DEFAULT,
  SHELTERED_ORDER_DEFAULT,
  SHELTERED_PAGE_DEFAULT,
} from "../constants";

export class QueryShelteredDto {
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

  @IsOptional()
  @IsEnum(ShelteredOrderBy)
  orderBy: ShelteredOrderBy = SHELTERED_ORDER_BY_DEFAULT;

  @IsOptional()
  @IsEnum(SortOrder)
  order: SortOrder = SHELTERED_ORDER_DEFAULT;

  /** Matches the acolhido name, guardian name or guardian phone. */
  @IsOptional()
  @IsString()
  searchString?: string;

  /** Matches the shelter name, city or state. */
  @IsOptional()
  @IsString()
  shelterSearchingString?: string;

  /** Matches the acolhido address street, district, city or state. */
  @IsOptional()
  @IsString()
  addressFilter?: string;

  @IsOptional()
  @IsUUID()
  shelterId?: string;

  @IsOptional()
  @IsEnum(ShelteredGender)
  gender?: ShelteredGender;

  @IsOptional()
  @IsDateString()
  birthDateFrom?: string;

  @IsOptional()
  @IsDateString()
  birthDateTo?: string;

  @IsOptional()
  @IsDateString()
  joinedFrom?: string;

  @IsOptional()
  @IsDateString()
  joinedTo?: string;
}
