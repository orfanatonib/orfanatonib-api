import { IsNumber, IsUUID, IsOptional, IsArray, ArrayUnique, Min, IsString } from 'class-validator';

export class CreateTeamDto {
  @IsNumber()
  @Min(1)
  numberTeam!: number;

  @IsOptional()
  @IsString()
  description?: string;

  @IsUUID()
  shelterId!: string;

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

