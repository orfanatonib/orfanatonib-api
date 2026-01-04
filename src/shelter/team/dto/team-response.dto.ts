import { Exclude, Expose, Type } from 'class-transformer';

export class TeamLeaderDto {
  @Expose() id!: string;
  @Expose() name!: string;
  @Expose() email!: string;
  @Expose() phone!: string;
}

export class TeamTeacherDto {
  @Expose() id!: string; // ID do perfil do professor
  @Expose() name!: string;
  @Expose() email!: string;
  @Expose() phone!: string;
}

export class TeamShelterDto {
  @Expose() id!: string;
  @Expose() name!: string;
  @Expose() description?: string;
  @Expose() address?: {
    street?: string;
    number?: string;
    district?: string;
    city: string;
    state: string;
    postalCode?: string;
    complement?: string;
  };
}

@Exclude()
export class TeamResponseDto {
  @Expose() id!: string;
  @Expose() numberTeam!: number;
  @Expose() description?: string;
  @Expose() shelterId!: string;

  @Expose()
  @Type(() => TeamShelterDto)
  shelter?: TeamShelterDto;

  @Expose()
  @Type(() => TeamLeaderDto)
  leaders!: TeamLeaderDto[];

  @Expose()
  @Type(() => TeamTeacherDto)
  teachers!: TeamTeacherDto[];

  @Expose() createdAt!: Date;
  @Expose() updatedAt!: Date;
}

