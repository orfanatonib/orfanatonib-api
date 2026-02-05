import { Exclude, Expose, Transform, Type, plainToInstance } from 'class-transformer';
import { LeaderProfileEntity } from '../entities/leader-profile.entity/leader-profile.entity';

@Exclude()
class ProfileImageMiniDto {
  @Expose() id!: string;
  @Expose() url!: string;
  @Expose() title!: string;
  @Expose() description!: string;
  @Expose() uploadType!: string;
  @Expose() mediaType!: string;
  @Expose() isLocalFile!: boolean;
}

@Exclude()
class UserMiniDto {
  @Expose()
  id!: string;

  @Expose()
  name!: string;

  @Expose()
  @Type(() => ProfileImageMiniDto)
  imageProfile?: ProfileImageMiniDto | null;
}

@Exclude()
class TeamMiniDto {
  @Expose() id!: string;
  @Expose() numberTeam!: number;
  @Expose() description?: string;
}

@Exclude()
class ShelterMiniDto {
  @Expose() id!: string;
  @Expose() name!: string;

  @Expose()
  @Type(() => TeamMiniDto)
  @Transform(({ value }) => (Array.isArray(value) ? value : []))
  teams!: TeamMiniDto[];
}

@Exclude()
export class LeaderSimpleListDto {
  @Expose()
  @Transform(({ obj }) => obj.id)
  leaderProfileId!: string;

  @Expose()
  @Type(() => UserMiniDto)
  @Transform(({ obj }) => obj.user ? { id: obj.user.id, name: obj.user.name, imageProfile: obj.user.imageProfile || null } : null)
  user!: UserMiniDto;

  @Expose()
  @Transform(({ obj }) => !!(obj.teams && obj.teams.length > 0))
  vinculado!: boolean;

  @Expose()
  @Type(() => ShelterMiniDto)
  @Transform(({ obj }) => {
    if (!obj.teams || !Array.isArray(obj.teams) || obj.teams.length === 0) {
      return [];
    }

    const sheltersMap = new Map<string, ShelterMiniDto>();

    for (const team of obj.teams) {
      if (!team || !team.shelter) continue;

      const shelterId = team.shelter.id;

      if (!sheltersMap.has(shelterId)) {
        sheltersMap.set(shelterId, {
          id: team.shelter.id,
          name: team.shelter.name,
          teams: [],
        });
      }

      const shelter = sheltersMap.get(shelterId)!;

      shelter.teams!.push({
        id: team.id,
        numberTeam: team.numberTeam,
        description: team.description,
      });
    }

    return Array.from(sheltersMap.values());
  })
  shelters!: ShelterMiniDto[];
}

export const toLeaderSimple = (entity: LeaderProfileEntity): LeaderSimpleListDto =>
  plainToInstance(LeaderSimpleListDto, entity, { excludeExtraneousValues: true });
