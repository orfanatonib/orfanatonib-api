import { UserEntity } from "src/core/user/entities/user.entity";
import { AddressEntity } from "src/shelter/address/entities/address.entity/address.entity";
import { LeaderProfileEntity } from "src/shelter/leader-profile/entities/leader-profile.entity/leader-profile.entity";
import { MemberProfileEntity } from "src/shelter/member-profile/entities/member-profile.entity/member-profile.entity";
import { ShelterEntity } from "src/shelter/shelter/entities/shelter.entity/shelter.entity";
import { TeamEntity } from "src/shelter/team/entities/team.entity";
import {
  MediaItemEntity,
  MediaType,
  UploadType,
} from "src/shared/media/media-item/media-item.entity";
import { UserRole } from "./auth.types";
import { AUTH_USER_MEDIA_TARGET } from "./constants/auth.constants";
import { LoginDto } from "./dto/login.dto";
import { RegisterUserDto } from "./dto/register.dto";
import { CompleteUserDto } from "./dto/complete-register.dto";

export const FIXED_CREATED_AT = new Date("2026-01-10T12:30:00.000Z");
export const FIXED_UPDATED_AT = new Date("2026-02-20T08:00:00.000Z");

export const buildUserEntity = (
  overrides: Partial<UserEntity> = {},
): UserEntity =>
  Object.assign(new UserEntity(), {
    id: "user-id",
    email: "maria@orfanatonib.test",
    password: "$2a$10$hash",
    phone: "92999990000",
    name: "Maria Souza",
    active: true,
    completed: true,
    commonUser: false,
    role: UserRole.MEMBER,
    refreshToken: null,
    memberProfile: null,
    leaderProfile: null,
    createdAt: FIXED_CREATED_AT,
    updatedAt: FIXED_UPDATED_AT,
    ...overrides,
  });

export const buildAddressEntity = (
  overrides: Partial<AddressEntity> = {},
): AddressEntity =>
  Object.assign(new AddressEntity(), {
    id: "address-id",
    street: "Rua das Flores",
    number: "100",
    district: "Centro",
    city: "Manaus",
    state: "AM",
    postalCode: "69000000",
    createdAt: FIXED_CREATED_AT,
    updatedAt: FIXED_UPDATED_AT,
    ...overrides,
  });

export const buildShelterEntity = (
  overrides: Partial<ShelterEntity> = {},
): ShelterEntity =>
  Object.assign(new ShelterEntity(), {
    id: "shelter-id",
    name: "Abrigo Esperança",
    description: "Abrigo de referência",
    teamsQuantity: 2,
    address: buildAddressEntity(),
    createdAt: FIXED_CREATED_AT,
    updatedAt: FIXED_UPDATED_AT,
    ...overrides,
  });

export const buildTeamEntity = (
  overrides: Partial<TeamEntity> = {},
): TeamEntity =>
  Object.assign(new TeamEntity(), {
    id: "team-id",
    numberTeam: 1,
    description: "Equipe 1",
    shelter: buildShelterEntity(),
    createdAt: FIXED_CREATED_AT,
    updatedAt: FIXED_UPDATED_AT,
    ...overrides,
  });

export const buildMemberProfile = (
  overrides: Partial<MemberProfileEntity> = {},
): MemberProfileEntity =>
  Object.assign(new MemberProfileEntity(), {
    id: "member-profile-id",
    active: true,
    team: buildTeamEntity(),
    createdAt: FIXED_CREATED_AT,
    updatedAt: FIXED_UPDATED_AT,
    ...overrides,
  });

export const buildLeaderProfile = (
  overrides: Partial<LeaderProfileEntity> = {},
): LeaderProfileEntity =>
  Object.assign(new LeaderProfileEntity(), {
    id: "leader-profile-id",
    active: true,
    teams: [buildTeamEntity()],
    createdAt: FIXED_CREATED_AT,
    updatedAt: FIXED_UPDATED_AT,
    ...overrides,
  });

export const buildMediaItem = (
  overrides: Partial<MediaItemEntity> = {},
): MediaItemEntity =>
  Object.assign(new MediaItemEntity(), {
    id: "media-id",
    title: "Foto de perfil",
    description: "Avatar",
    mediaType: MediaType.IMAGE,
    uploadType: UploadType.UPLOAD,
    url: "https://bucket/avatar.png",
    isLocalFile: true,
    originalName: "avatar.png",
    size: 1024,
    targetId: "user-id",
    targetType: AUTH_USER_MEDIA_TARGET,
    createdAt: FIXED_CREATED_AT,
    updatedAt: FIXED_UPDATED_AT,
    ...overrides,
  });

export const buildLoginDto = (overrides: Partial<LoginDto> = {}): LoginDto =>
  Object.assign(new LoginDto(), {
    email: "maria@orfanatonib.test",
    password: "E2e@12345",
    ...overrides,
  });

export const buildRegisterDto = (
  overrides: Partial<RegisterUserDto> = {},
): RegisterUserDto =>
  Object.assign(new RegisterUserDto(), {
    name: "Maria Souza",
    email: "maria@orfanatonib.test",
    phone: "92999990000",
    password: "E2e@12345",
    role: UserRole.MEMBER,
    ...overrides,
  });

export const buildCompleteRegisterDto = (
  overrides: Partial<CompleteUserDto> = {},
): CompleteUserDto =>
  Object.assign(new CompleteUserDto(), {
    email: "maria@orfanatonib.test",
    name: "Maria Souza",
    phone: "92999990000",
    password: "E2e@12345",
    ...overrides,
  });

export const buildTokens = () => ({
  accessToken: "access-token",
  refreshToken: "refresh-token",
});
