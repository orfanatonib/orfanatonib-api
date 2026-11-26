import { UserEntity } from "src/core/user/entities/user.entity";
import { AddressEntity } from "src/shelter/address/entities/address.entity/address.entity";
import { ShelterEntity } from "src/shelter/shelter/entities/shelter.entity/shelter.entity";
import { TeamEntity } from "src/shelter/team/entities/team.entity";
import { MediaItemEntity } from "src/shared/media/media-item/media-item.entity";
import {
  AddressLiteDto,
  LeaderProfileLiteDto,
  MediaResponseDto,
  MemberProfileLiteDto,
  MeResponseDto,
  PersonalDataLiteDto,
  PreferencesLiteDto,
  ShelterLiteDto,
  TeamLiteDto,
} from "../dto/me-response.dto";

/**
 * A árvore usuário → perfil → equipe → abrigo → endereço era montada à mão duas
 * vezes no `AuthService`: uma em `getMe` e outra em `buildMeResponse`, que
 * ninguém chamava. Eram 107 linhas duplicadas, já divergindo entre si. Aqui
 * cada nível é uma função, e a de cima compõe.
 */

const toAddressDto = (
  address: AddressEntity | null | undefined,
): AddressLiteDto | null =>
  address
    ? {
        id: address.id,
        street: address.street,
        number: address.number,
        district: address.district,
        city: address.city,
        state: address.state,
        postalCode: address.postalCode,
        createdAt: address.createdAt,
        updatedAt: address.updatedAt,
      }
    : null;

const toShelterDto = (
  shelter: ShelterEntity | null | undefined,
): ShelterLiteDto | null =>
  shelter
    ? {
        id: shelter.id,
        name: shelter.name,
        description: shelter.description,
        teamsQuantity: shelter.teamsQuantity,
        address: toAddressDto(shelter.address),
        createdAt: shelter.createdAt,
        updatedAt: shelter.updatedAt,
      }
    : null;

const toTeamDto = (team: TeamEntity | null | undefined): TeamLiteDto | null =>
  team
    ? {
        id: team.id,
        numberTeam: team.numberTeam,
        description: team.description,
        shelter: toShelterDto(team.shelter),
        createdAt: team.createdAt,
        updatedAt: team.updatedAt,
      }
    : null;

export const toMediaResponseDto = (
  media: MediaItemEntity | null | undefined,
): MediaResponseDto | null =>
  media
    ? {
        id: media.id,
        title: media.title,
        description: media.description,
        url: media.url,
        uploadType: media.uploadType,
        mediaType: media.mediaType,
        isLocalFile: media.isLocalFile,
        platformType: media.platformType,
        originalName: media.originalName,
        size: media.size,
        createdAt: media.createdAt,
        updatedAt: media.updatedAt,
      }
    : null;

const toMemberProfileDto = (user: UserEntity): MemberProfileLiteDto | null => {
  const profile = user.memberProfile;
  if (!profile) return null;

  return {
    id: profile.id,
    active: profile.active,
    team: toTeamDto(profile.team),
    createdAt: profile.createdAt,
    updatedAt: profile.updatedAt,
  };
};

const toLeaderProfileDto = (user: UserEntity): LeaderProfileLiteDto | null => {
  const profile = user.leaderProfile;
  if (!profile) return null;

  return {
    id: profile.id,
    active: profile.active,
    teams: (profile.teams ?? [])
      .map((team) => toTeamDto(team))
      .filter((team): team is TeamLiteDto => team !== null),
    createdAt: profile.createdAt,
    updatedAt: profile.updatedAt,
  };
};

export interface MeExtras {
  image: MediaItemEntity | null;
  personalData?: PersonalDataLiteDto;
  preferences?: PreferencesLiteDto;
}

export const toMeDto = (user: UserEntity, extras: MeExtras): MeResponseDto => ({
  id: user.id,
  email: user.email,
  phone: user.phone,
  name: user.name,
  role: user.role,
  commonUser: user.commonUser,
  image: toMediaResponseDto(extras.image),
  personalData: extras.personalData,
  preferences: extras.preferences,
  memberProfile: toMemberProfileDto(user),
  leaderProfile: toLeaderProfileDto(user),
});
