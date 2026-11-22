import {
  IsBoolean,
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from "class-validator";
import { Type } from "class-transformer";
import { StrictBoolean } from "src/common/decorators/strict-boolean.decorator";

export class UpdatePagelaDto {
  @IsOptional()
  @IsUUID()
  memberProfileId?: string;

  @IsOptional()
  @IsDateString()
  referenceDate?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  visit?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(2000)
  @Max(9999)
  year?: number;

  @IsOptional()
  @StrictBoolean()
  @IsBoolean()
  present?: boolean;

  @IsOptional()
  @IsString()
  notes?: string | null;
}
