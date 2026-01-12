import { Exclude, Expose, Transform, plainToInstance } from 'class-transformer';
import { MemberProfileEntity } from '../entities/member-profile.entity/member-profile.entity';

@Exclude()
export class MemberSimpleListDto {
  @Expose()
  @Transform(({ obj }) => obj.id)
  memberProfileId!: string;

  @Expose()
  @Transform(({ obj }) => obj.user?.name || obj.user?.email || '—')
  name!: string;

  @Expose()
  @Transform(({ obj }) => !!obj.team)
  vinculado!: boolean;
}

export const toMemberSimple = (entity: MemberProfileEntity): MemberSimpleListDto =>
  plainToInstance(MemberSimpleListDto, entity, { excludeExtraneousValues: true });
