import { Exclude, Expose, Type, Transform, plainToInstance } from 'class-transformer';
import { MemberProfileEntity } from '../entities/member-profile.entity/member-profile.entity';

@Exclude()
class UserMiniDto {
  @Expose() id!: string;
  @Expose() name!: string;
  @Expose() email!: string;
  @Expose() phone!: string;
  @Expose() active!: boolean;
  @Expose() completed!: boolean;
  @Expose() commonUser!: boolean;
}

@Exclude()
export class MemberMiniDto {
  @Expose() id!: string;
  @Expose() active!: boolean;

  @Expose()
  @Type(() => UserMiniDto)
  user!: UserMiniDto;
}

@Exclude()
export class CoordinatorMiniDto {
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
  team!: TeamMiniDto | null;

  @Expose()
  @Type(() => CoordinatorMiniDto)
  @Transform(({ value }) => value ?? null)
  leader!: CoordinatorMiniDto | null;
}

@Exclude()
export class MemberResponseDto {
  @Expose() id!: string;
  @Expose() active!: boolean;

  @Expose()
  @Type(() => UserMiniDto)
  user!: UserMiniDto;

  @Expose()
  @Type(() => ShelterMiniWithCoordinatorDto)
  @Transform(({ obj }) => {
    if (!obj.team || !obj.team.shelter) {
      return null;
    }

    return {
      id: obj.team.shelter.id,
      name: obj.team.shelter.name,
      team: {
        id: obj.team.id,
        numberTeam: obj.team.numberTeam,
        description: obj.team.description,
      },
      leader: obj.team.leaders && obj.team.leaders.length > 0
        ? {
            id: obj.team.leaders[0].id,
            active: obj.team.leaders[0].active,
            user: obj.team.leaders[0].user,
          }
        : null,
    };
  })
  shelter!: ShelterMiniWithCoordinatorDto | null;

  @Expose() createdAt!: Date;
  @Expose() updatedAt!: Date;
}

export function toMemberDto(entity: MemberProfileEntity): MemberResponseDto {
  return plainToInstance(MemberResponseDto, entity, { excludeExtraneousValues: true });
}
