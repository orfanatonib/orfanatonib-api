import { IsNotEmpty, IsUUID, IsNumber, Min, IsString, IsOptional } from 'class-validator';

export class CreateVisitReportDto {
  @IsNumber()
  @IsNotEmpty()
  @Min(0)
  teamMembersPresent!: number;

  @IsNumber()
  @IsNotEmpty()
  @Min(0)
  shelteredHeardMessage!: number;

  @IsNumber()
  @IsNotEmpty()
  @Min(0)
  caretakersHeardMessage!: number;

  @IsNumber()
  @IsNotEmpty()
  @Min(0)
  shelteredDecisions!: number;

  @IsNumber()
  @IsNotEmpty()
  @Min(0)
  caretakersDecisions!: number;

  @IsString()
  @IsOptional()
  observation?: string;

  @IsUUID()
  @IsNotEmpty()
  scheduleId!: string;
}
