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

export class CreatePagelaDto {
  @IsUUID()
  shelteredId: string;

  @IsUUID()
  memberProfileId: string;

  @IsDateString()
  referenceDate: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  visit: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(2000)
  @Max(9999)
  year?: number;

  // Mantém o valor cru: com a conversão implícita, "talvez" viraria `true` antes do `@IsBoolean`.
  @StrictBoolean()
  @IsBoolean()
  present: boolean;

  @IsOptional()
  @IsString()
  notes?: string;
}
