import {
  Exclude,
  Expose,
  Type,
  Transform,
  plainToInstance,
} from "class-transformer";
import { AddressResponseDto } from "src/shelter/address/dto/address.response.dto";
import { ShelterEntity } from "../entities/shelter.entity/shelter.entity";
import { toArrayOrEmpty } from "../utils/shelter-transform.util";
import {
  MediaItemEntity,
  UploadType,
  PlatformType,
} from "src/shared/media/media-item/media-item.entity";

@Exclude()
export class UserMiniDto {
  @Expose() id!: string;
  @Expose() name!: string;
  @Expose() email!: string;
  @Expose() phone!: string;
  @Expose() active!: boolean;
  @Expose() completed!: boolean;
  @Expose() commonUser!: boolean;

  @Expose()
  @Type(() => MediaItemResponseDto)
  @Transform(({ value }: { value?: MediaItemEntity | null }) =>
    value ? MediaItemResponseDto.fromEntity(value) : null,
  )
  imageProfile?: MediaItemResponseDto | null;
}

@Exclude()
export class MediaItemResponseDto {
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
    return plainToInstance(MediaItemResponseDto, entity, {
      excludeExtraneousValues: true,
    });
  }
}

@Exclude()
export class CoordinatorWithUserDto {
  @Expose() id!: string;
  @Expose() active!: boolean;

  @Expose()
  @Type(() => UserMiniDto)
  user!: UserMiniDto;
}

@Exclude()
export class MemberWithUserDto {
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
  address?: AddressResponseDto;

  @Expose()
  @Type(() => TeamWithMembersDto)
  @Transform(({ value }: { value?: unknown }) => toArrayOrEmpty(value))
  teams!: TeamWithMembersDto[];

  @Expose()
  @Type(() => MediaItemResponseDto)
  @Transform(({ value }: { value?: MediaItemEntity | null }) =>
    value ? MediaItemResponseDto.fromEntity(value) : null,
  )
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
  address?: AddressResponseDto;

  @Expose()
  @Type(() => TeamWithLeaderStatusDto)
  @Transform(({ value }: { value?: unknown }) => toArrayOrEmpty(value))
  teams!: TeamWithLeaderStatusDto[];

  @Expose()
  @Type(() => MediaItemResponseDto)
  @Transform(({ value }: { value?: MediaItemEntity | null }) =>
    value ? MediaItemResponseDto.fromEntity(value) : null,
  )
  mediaItem?: MediaItemResponseDto | null;

  @Expose() createdAt!: Date;
  @Expose() updatedAt!: Date;
}

@Exclude()
export class TeamWithMembersDto {
  @Expose() id!: string;
  @Expose() numberTeam!: number;
  @Expose() description?: string;

  @Expose()
  @Type(() => CoordinatorWithUserDto)
  @Transform(({ value }: { value?: unknown }) => toArrayOrEmpty(value))
  leaders!: CoordinatorWithUserDto[];

  @Expose()
  @Type(() => MemberWithUserDto)
  @Transform(({ value }: { value?: unknown }) => toArrayOrEmpty(value))
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
  address?: AddressResponseDto;

  @Expose()
  @Type(() => TeamWithMembersDto)
  @Transform(({ value }: { value?: unknown }) => toArrayOrEmpty(value))
  teams!: TeamWithMembersDto[];

  @Expose()
  @Type(() => CoordinatorWithUserDto)
  @Transform(({ obj }: { obj: ShelterEntity }) => {
    const leadersMap = new Map<string, CoordinatorWithUserDto>();
    if (Array.isArray(obj.teams)) {
      obj.teams.forEach((team) => {
        if (Array.isArray(team.leaders)) {
          team.leaders.forEach((leader) => {
            if (!leadersMap.has(leader.id)) {
              leadersMap.set(
                leader.id,
                plainToInstance(CoordinatorWithUserDto, leader, {
                  excludeExtraneousValues: true,
                }),
              );
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
  @Transform(({ obj }: { obj: ShelterEntity }) => {
    const membersMap = new Map<string, MemberWithUserDto>();
    if (Array.isArray(obj.teams)) {
      obj.teams.forEach((team) => {
        if (Array.isArray(team.members)) {
          team.members.forEach((member) => {
            if (!membersMap.has(member.id)) {
              membersMap.set(
                member.id,
                plainToInstance(MemberWithUserDto, member, {
                  excludeExtraneousValues: true,
                }),
              );
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
  @Transform(({ value }: { value?: MediaItemEntity | null }) =>
    value ? MediaItemResponseDto.fromEntity(value) : null,
  )
  mediaItem?: MediaItemResponseDto | null;

  @Expose() createdAt!: Date;
  @Expose() updatedAt!: Date;
}
