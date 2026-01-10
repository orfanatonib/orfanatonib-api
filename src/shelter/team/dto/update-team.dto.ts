import { IsNumber, IsOptional, IsArray, ArrayUnique, IsUUID, Min, IsString } from 'class-validator';

export class UpdateTeamDto {
  @IsOptional()
  @IsNumber()
  @Min(1)
  numberTeam?: number;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsUUID(undefined, { each: true })
  leaderProfileIds?: string[];

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsUUID(undefined, { each: true })
  teacherProfileIds?: string[];
}

