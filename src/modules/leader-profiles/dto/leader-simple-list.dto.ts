import { Exclude, Expose, Transform, plainToInstance } from 'class-transformer';
import { LeaderProfileEntity } from '../entities/leader-profile.entity/leader-profile.entity';

@Exclude()
export class LeaderSimpleListDto {
  @Expose()
  @Transform(({ obj }) => obj.id)
  leaderProfileId!: string;

  @Expose()
  @Transform(({ obj }) => obj.user?.name)
  name!: string;

  @Expose()
  @Transform(({ obj }) => !!(obj.teams && obj.teams.length > 0))
  vinculado!: boolean;
}

export const toLeaderSimple = (entity: LeaderProfileEntity): LeaderSimpleListDto =>
  plainToInstance(LeaderSimpleListDto, entity, { excludeExtraneousValues: true });
