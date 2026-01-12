import { IsUUID, IsNumber, Min } from 'class-validator';

/**
 * DTO para vincular professor a uma equipe de um abrigo
 */
export class ManageMemberTeamDto {
  @IsUUID()
  shelterId!: string;

  @IsNumber()
  @Min(1)
  numberTeam!: number;
}

