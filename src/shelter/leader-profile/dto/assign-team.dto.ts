import { IsUUID, IsNumber, Min, IsArray, ArrayMinSize, ValidateNested, IsNotEmpty } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * DTO para vincular líder a uma equipe de um abrigo (mantido para compatibilidade)
 */
export class ManageLeaderTeamDto {
  @IsUUID()
  shelterId!: string;

  @IsNumber()
  @Min(1)
  numberTeam!: number;
}

/**
 * DTO para uma equipe específica em um abrigo
 */
export class ShelterTeamDto {
  @IsUUID()
  shelterId!: string;

  @IsArray()
  @IsNumber({}, { each: true })
  @ArrayMinSize(1)
  @IsNotEmpty({ each: true })
  teams!: number[];
}

/**
 * DTO para gerenciar múltiplas equipes de múltiplos abrigos para um líder
 */
export class ManageLeaderTeamsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ShelterTeamDto)
  @ArrayMinSize(1)
  assignments!: ShelterTeamDto[];
}

