import { Exclude, Expose } from 'class-transformer';

@Exclude()
export class ShelterTeamNameResponseDto {
  @Expose() id!: string;
  @Expose() teamName!: string;
}

