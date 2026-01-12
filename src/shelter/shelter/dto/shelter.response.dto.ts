import { Exclude, Expose, Type, Transform, plainToInstance } from 'class-transformer';
import { AddressResponseDto } from 'src/shelter/address/dto/address.response.dto';
import { ShelterEntity } from '../entities/shelter.entity/shelter.entity';
import { MediaItemEntity, MediaType, UploadType, PlatformType } from 'src/shared/media/media-item/media-item.entity';

@Exclude()
class UserMiniDto {
  @Expose() id!: string;
  @Expose() name!: string;
  @Expose() email!: string;
  @Expose() phone!: string;
  @Expose() active!: boolean;
  @Expose() completed!: boolean;
  @Expose() commonUser!: boolean;

  /**
   * Imagem/mídia vinculada ao usuário (ex: foto de perfil), quando existir.
   * Mesmo formato de `mediaItem` usado no abrigo.
   */
  @Expose()
  @Type(() => MediaItemResponseDto)
  @Transform(({ value }) => (value ? MediaItemResponseDto.fromEntity(value) : null))
  mediaItem?: MediaItemResponseDto | null;
}

@Exclude()
class MediaItemResponseDto {
  @Expose() id!: string;
  @Expose() title!: string;
  @Expose() description!: string;
  @Expose() uploadType!: UploadType;
  @Expose() url!: string;
  @Expose() isLocalFile!: boolean;
  @Expose() platformType?: PlatformType;
  @Expose() originalName?: string;
  @Expose() size?: number;
  @Expose() createdAt!: Date;
  @Expose() updatedAt!: Date;

  static fromEntity(entity: MediaItemEntity): MediaItemResponseDto {
    return plainToInstance(MediaItemResponseDto, entity, { excludeExtraneousValues: true });
  }
}

@Exclude()
class CoordinatorWithUserDto {
  @Expose() id!: string;
  @Expose() active!: boolean;

  @Expose()
  @Type(() => UserMiniDto)
  user!: UserMiniDto;
}

@Exclude()
class MemberWithUserDto {
  @Expose() id!: string;
  @Expose() active!: boolean;

  @Expose()
  @Type(() => UserMiniDto)
  user!: UserMiniDto;
}

@Exclude()
export class ChelterMiniDto {
  @Expose() id!: string;
  @Expose() name!: string;
}

@Exclude()
export class ShelterSimpleResponseDto {
  @Expose() id!: string;
  @Expose() name!: string;
  @Expose() description?: string;
  @Expose() teamsQuantity?: number;

  @Expose()
  @Type(() => AddressResponseDto)
  address!: AddressResponseDto;

  @Expose()
  @Type(() => TeamWithMembersDto)
  @Transform(({ value }) => (Array.isArray(value) ? value : []))
  teams!: TeamWithMembersDto[];

  @Expose()
  @Type(() => MediaItemResponseDto)
  @Transform(({ value }) => value ? MediaItemResponseDto.fromEntity(value) : null)
  mediaItem?: MediaItemResponseDto | null;

  @Expose() createdAt!: Date;
  @Expose() updatedAt!: Date;
}

@Exclude()
export class ShelterWithLeaderStatusDto {
  @Expose() id!: string;
  @Expose() name!: string;
  @Expose() description?: string;
  @Expose() teamsQuantity?: number;

  @Expose()
  @Type(() => AddressResponseDto)
  address!: AddressResponseDto;

  @Expose()
  @Type(() => TeamWithLeaderStatusDto)
  @Transform(({ value }) => (Array.isArray(value) ? value : []))
  teams!: TeamWithLeaderStatusDto[];

  @Expose()
  @Type(() => MediaItemResponseDto)
  @Transform(({ value }) => value ? MediaItemResponseDto.fromEntity(value) : null)
  mediaItem?: MediaItemResponseDto | null;

  @Expose() createdAt!: Date;
  @Expose() updatedAt!: Date;
}

@Exclude()
class TeamWithMembersDto {
  @Expose() id!: string;
  @Expose() numberTeam!: number;
  @Expose() description?: string;

  @Expose()
  @Type(() => CoordinatorWithUserDto)
  @Transform(({ value }) => (Array.isArray(value) ? value : []))
  leaders!: CoordinatorWithUserDto[];

  @Expose()
  @Type(() => MemberWithUserDto)
  @Transform(({ value }) => (Array.isArray(value) ? value : []))
  members!: MemberWithUserDto[];
}

@Exclude()
export class TeamWithLeaderStatusDto extends TeamWithMembersDto {
  @Expose() isLeaderInTeam!: boolean;
}

@Exclude()
export class ShelterResponseDto {
  @Expose() id!: string;
  @Expose() name!: string;
  @Expose() description?: string;
  @Expose() teamsQuantity?: number;

  @Expose()
  @Type(() => AddressResponseDto)
  address!: AddressResponseDto;

  @Expose()
  @Type(() => TeamWithMembersDto)
  @Transform(({ value }) => (Array.isArray(value) ? value : []))
  teams!: TeamWithMembersDto[];

  @Expose()
  @Type(() => CoordinatorWithUserDto)
  @Transform(({ obj }) => {
    const leadersMap = new Map<string, CoordinatorWithUserDto>();
    if (obj.teams && Array.isArray(obj.teams)) {
      obj.teams.forEach((team: { leaders?: CoordinatorWithUserDto[] }) => {
        if (team.leaders && Array.isArray(team.leaders)) {
          team.leaders.forEach((leader: any) => {
            if (!leadersMap.has(leader.id)) {
              leadersMap.set(leader.id, plainToInstance(CoordinatorWithUserDto, leader, { excludeExtraneousValues: true }));
            }
          });
        }
      });
    }
    return Array.from(leadersMap.values());
  })
  leaders!: CoordinatorWithUserDto[];

  @Expose()
  @Type(() => MemberWithUserDto)
  @Transform(({ obj }) => {
    const membersMap = new Map<string, MemberWithUserDto>();
    if (obj.teams && Array.isArray(obj.teams)) {
      obj.teams.forEach((team: { members?: MemberWithUserDto[] }) => {
        if (team.members && Array.isArray(team.members)) {
          team.members.forEach((member: any) => {
            if (!membersMap.has(member.id)) {
              membersMap.set(member.id, plainToInstance(MemberWithUserDto, member, { excludeExtraneousValues: true }));
            }
          });
        }
      });
    }
    return Array.from(membersMap.values());
  })
  members!: MemberWithUserDto[];

  @Expose()
  @Type(() => MediaItemResponseDto)
  @Transform(({ value }) => value ? MediaItemResponseDto.fromEntity(value) : null)
  mediaItem?: MediaItemResponseDto | null;

  @Expose() createdAt!: Date;
  @Expose() updatedAt!: Date;
}

export function toShelterSimpleDto(entity: ShelterEntity, showAddress = true): ShelterSimpleResponseDto {
  const dto = plainToInstance(ShelterSimpleResponseDto, entity, { excludeExtraneousValues: true });
  if (!showAddress) {
    dto.address = undefined as any;
  }
  return dto;
}
export function toShelterDto(entity: ShelterEntity, showAddress = true): ShelterResponseDto {
  const dto = plainToInstance(ShelterResponseDto, entity, { excludeExtraneousValues: true });
  if (!showAddress) {
    dto.address = undefined as any;
  }
  return dto;
}

export function toShelterWithLeaderStatusDto(
  entity: ShelterEntity,
  leaderId: string,
  showAddress = true,
): ShelterWithLeaderStatusDto {
  const dto = plainToInstance(ShelterWithLeaderStatusDto, entity, { excludeExtraneousValues: true });
  if (!showAddress) {
    dto.address = undefined as any;
  }

  if (entity.teams && Array.isArray(entity.teams)) {
    dto.teams = entity.teams.map((team: any) => {
      const teamBase = plainToInstance(TeamWithLeaderStatusDto, team, { excludeExtraneousValues: true });

      const isLeaderInTeam = team.leaders?.some((leader: any) => leader.id === leaderId) ?? false;
      teamBase.isLeaderInTeam = isLeaderInTeam;

      return teamBase;
    });
  } else {
    dto.teams = [];
  }

  return dto;
}
