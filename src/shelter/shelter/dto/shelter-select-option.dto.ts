import { Exclude, Expose } from 'class-transformer';
import { ShelterEntity } from '../entities/shelter.entity/shelter.entity';

@Exclude()
export class ShelterSelectOptionDto {
  @Expose()
  id!: string;

  @Expose()
  name!: string;

  @Expose()
  leader!: boolean;
}

export function toShelterSelectOption(entity: ShelterEntity, showAddress = true): ShelterSelectOptionDto {
  const bairro = entity.address?.district?.trim();
  const hasLeaders = entity.teams?.some(team => team.leaders && team.leaders.length > 0) || false;
  return {
    id: entity.id,
    name: `${entity.name}${showAddress ? ` : ${bairro || '—'}` : ''}`,
    leader: hasLeaders,
  };
}
