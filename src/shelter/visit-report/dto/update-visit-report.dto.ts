import { IsOptional, IsNumber, Min, IsString } from 'class-validator';

export class UpdateVisitReportDto {
  @IsNumber()
  @IsOptional()
  @Min(0)
  teamMembersPresent?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  shelteredHeardMessage?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  caretakersHeardMessage?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  shelteredDecisions?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  caretakersDecisions?: number;

  @IsString()
  @IsOptional()
  observation?: string;
}
