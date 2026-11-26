import { ShelterEntity } from "src/shelter/shelter/entities/shelter.entity/shelter.entity";

/**
 * Builds the minimal shelter reference TypeORM needs to write the
 * `shelter_id` foreign key, without loading or asserting a full entity.
 */
export const buildShelterReference = (id: string): ShelterEntity =>
  Object.assign(new ShelterEntity(), { id });
