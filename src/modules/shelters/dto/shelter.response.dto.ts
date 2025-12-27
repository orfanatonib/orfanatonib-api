import { Exclude, Expose, Type, Transform, plainToInstance } from 'class-transformer';
import { AddressResponseDto } from 'src/modules/addresses/dto/address.response.dto';
import { ShelterEntity } from '../entities/shelter.entity/shelter.entity';
import { MediaItemEntity, MediaType, UploadType, PlatformType } from 'src/share/media/media-item/media-item.entity';

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
class TeacherWithUserDto {
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
  @Type(() => TeacherWithUserDto)
  @Transform(({ value }) => (Array.isArray(value) ? value : []))
  teachers!: TeacherWithUserDto[];
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
    const allLeaders: CoordinatorWithUserDto[] = [];
    if (obj.teams && Array.isArray(obj.teams)) {
      obj.teams.forEach((team: { leaders?: CoordinatorWithUserDto[] }) => {
        if (team.leaders && Array.isArray(team.leaders)) {
          team.leaders.forEach((leader: any) => {
            allLeaders.push(plainToInstance(CoordinatorWithUserDto, leader, { excludeExtraneousValues: true }));
          });
        }
      });
    }
    return allLeaders;
  })
  leaders!: CoordinatorWithUserDto[];

  @Expose()
  @Type(() => TeacherWithUserDto)
  @Transform(({ obj }) => {
    const allTeachers: TeacherWithUserDto[] = [];
    if (obj.teams && Array.isArray(obj.teams)) {
      obj.teams.forEach((team: { teachers?: TeacherWithUserDto[] }) => {
        if (team.teachers && Array.isArray(team.teachers)) {
          team.teachers.forEach((teacher: any) => {
            allTeachers.push(plainToInstance(TeacherWithUserDto, teacher, { excludeExtraneousValues: true }));
          });
        }
      });
    }
    return allTeachers;
  })
  teachers!: TeacherWithUserDto[];

  @Expose()
  @Type(() => MediaItemResponseDto)
  @Transform(({ value }) => value ? MediaItemResponseDto.fromEntity(value) : null)
  mediaItem?: MediaItemResponseDto | null;

  @Expose() createdAt!: Date;
  @Expose() updatedAt!: Date;
}

export function toShelterSimpleDto(entity: ShelterEntity): ShelterSimpleResponseDto {
  return plainToInstance(ShelterSimpleResponseDto, entity, { excludeExtraneousValues: true });
}
export function toShelterDto(entity: ShelterEntity): ShelterResponseDto {
  return plainToInstance(ShelterResponseDto, entity, { excludeExtraneousValues: true });
}

export function toShelterWithLeaderStatusDto(
  entity: ShelterEntity,
  leaderId: string,
): ShelterWithLeaderStatusDto {
  const dto = plainToInstance(ShelterWithLeaderStatusDto, entity, { excludeExtraneousValues: true });
  
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
