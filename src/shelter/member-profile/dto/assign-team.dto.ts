import { IsUUID, IsNumber, Min } from 'class-validator';

export class ManageMemberTeamDto {
  @IsUUID()
  shelterId!: string;

  @IsNumber()
  @Min(1)
  numberTeam!: number;
}

