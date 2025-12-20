import { Exclude, Expose, Type, Transform, plainToInstance } from 'class-transformer';
import { LeaderProfileEntity } from '../entities/leader-profile.entity/leader-profile.entity';

@Exclude()
class UserMiniDto {
  @Expose()
  id!: string;

  @Expose()
  name!: string;
  @Expose()
  email!: string;
  @Expose()
  phone!: string;
  @Expose()
  active!: boolean;
  @Expose()
  completed!: boolean;
  @Expose()
  commonUser!: boolean;
}

@Exclude()
export class TeacherMiniDto {
  @Expose() id!: string;
  @Expose() active!: boolean;

  @Expose()
  @Type(() => UserMiniDto)
  user!: UserMiniDto;
}

@Exclude()
class TeamMiniDto {
  @Expose() id!: string;
  @Expose() numberTeam!: number;
  @Expose() description?: string;
}

@Exclude()
export class ShelterMiniWithCoordinatorDto {
  @Expose() id!: string;
  @Expose() name!: string;

  @Expose()
  @Type(() => TeamMiniDto)
  @Transform(({ value }) => (Array.isArray(value) ? value : []))
  teams!: TeamMiniDto[];

  @Expose()
  @Type(() => TeacherMiniDto)
  @Transform(({ value }) => (Array.isArray(value) ? value : []))
  teachers!: TeacherMiniDto[];
}

@Exclude()
export class LeaderMiniDto {
  @Expose() id!: string;
  @Expose() active!: boolean;

  @Expose()
  @Type(() => UserMiniDto)
  user!: UserMiniDto;
}

@Exclude()
export class LeaderResponseDto {
  @Expose()
  id!: string;

  @Expose()
  active!: boolean;

  @Expose()
  @Type(() => UserMiniDto)
  user!: UserMiniDto;

  @Expose()
  @Type(() => ShelterMiniWithCoordinatorDto)
  @Transform(({ obj }) => {
    if (!obj.teams || !Array.isArray(obj.teams) || obj.teams.length === 0) {
      return [];
    }

    // Agrupar equipes por abrigo
    const sheltersMap = new Map<string, ShelterMiniWithCoordinatorDto>();

    for (const team of obj.teams) {
      if (!team || !team.shelter) continue;

      const shelterId = team.shelter.id;
      
      if (!sheltersMap.has(shelterId)) {
        sheltersMap.set(shelterId, {
          id: team.shelter.id,
          name: team.shelter.name,
          teams: [],
          teachers: [],
        });
      }

      const shelter = sheltersMap.get(shelterId)!;
      
      // Adicionar a equipe ao abrigo
      shelter.teams!.push({
        id: team.id,
        numberTeam: team.numberTeam,
        description: team.description,
      });

      // Adicionar professores da equipe (evitar duplicatas)
      if (team.teachers && Array.isArray(team.teachers)) {
        for (const teacher of team.teachers) {
          if (!shelter.teachers!.some(t => t.id === teacher.id)) {
            shelter.teachers!.push({
              id: teacher.id,
              active: teacher.active,
              user: teacher.user,
            });
          }
        }
      }
    }

    return Array.from(sheltersMap.values());
  })
  shelters!: ShelterMiniWithCoordinatorDto[];

  @Expose()
  createdAt!: Date;
  @Expose()
  updatedAt!: Date;
}

export function toLeaderDto(entity: LeaderProfileEntity): LeaderResponseDto {
  return plainToInstance(LeaderResponseDto, entity, { excludeExtraneousValues: true });
}
export function toLeaderMini(entity: LeaderProfileEntity): LeaderMiniDto {
  return plainToInstance(LeaderMiniDto, entity, { excludeExtraneousValues: true });
}
