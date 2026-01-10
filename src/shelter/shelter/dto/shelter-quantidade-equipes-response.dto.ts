import { Exclude, Expose } from 'class-transformer';

@Exclude()
export class ShelterTeamsQuantityResponseDto {
  @Expose() id!: string;
  @Expose() teamsQuantity!: number;
}

