import { Exclude, Expose } from 'class-transformer';
import { ShelterEntity } from '../entities/shelter.entity/shelter.entity';

@Exclude()
export class ShelterSelectOptionDto {
  @Expose()
  id!: string;

  @Expose()
  detalhe!: string;

  @Expose()
  leader!: boolean;
}

export function toShelterSelectOption(entity: ShelterEntity): ShelterSelectOptionDto {
  const bairro = entity.address?.district?.trim();
  const hasLeaders = entity.teams?.some(team => team.leaders && team.leaders.length > 0) || false;
  return {
    id: entity.id,
    detalhe: `${entity.name} : ${bairro || '—'}`,
    leader: hasLeaders,
  };
}
