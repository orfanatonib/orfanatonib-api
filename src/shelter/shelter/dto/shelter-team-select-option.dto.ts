import { Exclude, Expose } from 'class-transformer';
import { TeamEntity } from 'src/shelter/team/entities/team.entity';

@Exclude()
export class ShelterTeamSelectOptionDto {
  @Expose()
  id!: string; // teamId

  @Expose()
  shelterId!: string;

  @Expose()
  label!: string; // "Equipe X - Nome do abrigo"

  @Expose()
  teamNumber!: number;

  @Expose()
  shelterName!: string;
}

export function toShelterTeamSelectOption(team: TeamEntity): ShelterTeamSelectOptionDto {
  const shelterName = team.shelter?.name?.trim() || '—';
  const number = team.numberTeam;

  return {
    id: team.id,
    shelterId: team.shelter?.id || '',
    label: `Equipe ${number} - ${shelterName}`,
    teamNumber: number,
    shelterName,
  };
}

