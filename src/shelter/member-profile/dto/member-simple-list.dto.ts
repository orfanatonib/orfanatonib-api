import { Exclude, Expose, Transform, Type, plainToInstance } from 'class-transformer';
import { MemberProfileEntity } from '../entities/member-profile.entity/member-profile.entity';

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
export class MemberSimpleListDto {
  @Expose()
  @Transform(({ obj }) => obj.id)
  memberProfileId!: string;

  @Expose()
  @Transform(({ obj }) => obj.user?.name || obj.user?.email || '—')
  name!: string;

  @Expose()
  @Type(() => ProfileImageMiniDto)
  @Transform(({ obj }) => obj.user?.imageProfile || null)
  imageProfile?: ProfileImageMiniDto | null;

  @Expose()
  @Transform(({ obj }) => !!obj.team)
  vinculado!: boolean;
}

export const toMemberSimple = (entity: MemberProfileEntity): MemberSimpleListDto =>
  plainToInstance(MemberSimpleListDto, entity, { excludeExtraneousValues: true });
