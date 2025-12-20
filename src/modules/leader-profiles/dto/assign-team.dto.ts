import { IsUUID, IsNumber, Min } from 'class-validator';

/**
 * DTO para vincular líder a uma equipe de um abrigo
 */
export class ManageLeaderTeamDto {
  @IsUUID()
  shelterId!: string;

  @IsNumber()
  @Min(1)
  numberTeam!: number;
}

