import { Transform, Type } from "class-transformer";
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from "class-validator";

import { ContentAudience } from "../enums/content-audience.enum";
import { ContentPackageStatus } from "../enums/content-package-status.enum";

const MAX_CONTENT_STUDIO_PAGE_SIZE = 100;

export class QueryContentPackagesDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_CONTENT_STUDIO_PAGE_SIZE)
  limit?: number = 20;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsEnum(ContentPackageStatus)
  status?: ContentPackageStatus;

  @IsOptional()
  @IsEnum(ContentAudience)
  audience?: ContentAudience;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @Transform(({ value }) => value === true || value === "true")
  @IsBoolean()
  reviewQueue?: boolean;
}
