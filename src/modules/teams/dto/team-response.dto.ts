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

@Exclude()
export class TeamResponseDto {
  @Expose() id!: string;
  @Expose() numberTeam!: number;
  @Expose() description?: string;
  @Expose() shelterId!: string;
  
  @Expose()
  @Type(() => TeamLeaderDto)
  leaders!: TeamLeaderDto[];
  
  @Expose()
  @Type(() => TeamTeacherDto)
  teachers!: TeamTeacherDto[];
  
  @Expose() createdAt!: Date;
  @Expose() updatedAt!: Date;
}

