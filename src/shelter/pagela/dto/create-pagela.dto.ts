import { IsBoolean, IsDateString, IsInt, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreatePagelaDto {
  @IsUUID()
  shelteredId: string;

  @IsUUID()
  teacherProfileId: string;

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

  @IsBoolean()
  present: boolean;

  @IsOptional()
  @IsString()
  notes?: string;
}
