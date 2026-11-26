import { UserRole } from "src/core/auth/auth.types";
import { AddressEntity } from "src/shelter/address/entities/address.entity/address.entity";
import { LeaderProfileEntity } from "src/shelter/leader-profile/entities/leader-profile.entity/leader-profile.entity";
import { MemberProfileEntity } from "src/shelter/member-profile/entities/member-profile.entity/member-profile.entity";
import { TeamEntity } from "src/shelter/team/entities/team.entity";
import { UserEntity } from "src/core/user/entities/user.entity";
import {
  RouteEntity,
  RouteType,
} from "src/infrastructure/route/route-page.entity";
import {
  MediaItemEntity,
  MediaType,
  UploadType,
} from "src/shared/media/media-item/media-item.entity";
import { ShelterEntity } from "./entities/shelter.entity/shelter.entity";
import { CreateShelterDto } from "./dto/create-shelter.dto";
import { UpdateShelterDto } from "./dto/update-shelter.dto";
import { QuerySheltersDto } from "./dto/query-shelters.dto";
import { SHELTER_MEDIA_TARGET } from "./constants";
import { ShelterAccessContext } from "./types";

export const FIXED_CREATED_AT = new Date("2026-01-10T12:30:00.000Z");
export const FIXED_UPDATED_AT = new Date("2026-02-20T08:00:00.000Z");

export const buildAdminContext = (
  overrides: Partial<ShelterAccessContext> = {},
): ShelterAccessContext => ({
  userId: "admin-user-id",
  role: UserRole.ADMIN,
  ...overrides,
});

export const buildLeaderContext = (
  overrides: Partial<ShelterAccessContext> = {},
): ShelterAccessContext => ({
  userId: "leader-user-id",
  role: UserRole.LEADER,
  ...overrides,
});

export const buildMemberContext = (
  overrides: Partial<ShelterAccessContext> = {},
): ShelterAccessContext => ({
  userId: "member-user-id",
  role: UserRole.MEMBER,
  ...overrides,
});

export const buildAnonymousContext = (): ShelterAccessContext => ({
  userId: null,
  role: null,
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
    complement: "Apto 2",
    createdAt: FIXED_CREATED_AT,
    updatedAt: FIXED_UPDATED_AT,
    ...overrides,
  });

export const buildUserEntity = (
  overrides: Partial<UserEntity> = {},
): UserEntity =>
  Object.assign(new UserEntity(), {
    id: "user-id",
    name: "Maria Souza",
    email: "maria@orfanatonib.test",
    phone: "92999990000",
    active: true,
    completed: true,
    commonUser: false,
    role: UserRole.LEADER,
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
    user: buildUserEntity({ id: "leader-user-id" }),
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
    user: buildUserEntity({ id: "member-user-id", role: UserRole.MEMBER }),
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
    leaders: [buildLeaderProfile()],
    members: [buildMemberProfile()],
    createdAt: FIXED_CREATED_AT,
    updatedAt: FIXED_UPDATED_AT,
    ...overrides,
  });

export const buildRouteEntity = (
  overrides: Partial<RouteEntity> = {},
): RouteEntity =>
  Object.assign(new RouteEntity(), {
    id: "route-id",
    title: "Abrigo Esperança",
    subtitle: "Manaus - AM, Centro 100",
    description: "Descrição",
    path: "abrigo_esperanca",
    type: RouteType.PAGE,
    entityId: "shelter-id",
    idToFetch: "shelter-id",
    entityType: "shelterPage",
    image: "",
    public: true,
    createdAt: FIXED_CREATED_AT,
    updatedAt: FIXED_UPDATED_AT,
    ...overrides,
  });

export const buildMediaItem = (
  overrides: Partial<MediaItemEntity> = {},
): MediaItemEntity =>
  Object.assign(new MediaItemEntity(), {
    id: "media-id",
    title: "Foto do Abrigo",
    description: "Imagem principal do abrigo",
    mediaType: MediaType.IMAGE,
    uploadType: UploadType.UPLOAD,
    url: "https://bucket/abrigo.png",
    isLocalFile: true,
    targetId: "shelter-id",
    targetType: SHELTER_MEDIA_TARGET,
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
    teamsQuantity: 1,
    address: buildAddressEntity(),
    teams: [buildTeamEntity()],
    sheltered: [],
    route: buildRouteEntity(),
    createdAt: FIXED_CREATED_AT,
    updatedAt: FIXED_UPDATED_AT,
    ...overrides,
  });

export const buildCreateShelterDto = (
  overrides: Partial<CreateShelterDto> = {},
): CreateShelterDto =>
  Object.assign(new CreateShelterDto(), {
    name: "Abrigo Esperança",
    description: "Abrigo de referência",
    teamsQuantity: 1,
    address: {
      street: "Rua das Flores",
      number: "100",
      district: "Centro",
      city: "Manaus",
      state: "AM",
      postalCode: "69000000",
    },
    teams: [{ numberTeam: 1, description: "Equipe 1" }],
    ...overrides,
  });

export const buildUpdateShelterDto = (
  overrides: Partial<UpdateShelterDto> = {},
): UpdateShelterDto =>
  Object.assign(new UpdateShelterDto(), {
    name: "Abrigo Esperança II",
    teamsQuantity: 1,
    ...overrides,
  });

export const buildQuerySheltersDto = (
  overrides: Partial<QuerySheltersDto> = {},
): QuerySheltersDto =>
  Object.assign(new QuerySheltersDto(), {
    page: 1,
    limit: 10,
    sort: "name",
    order: "ASC",
    ...overrides,
  });

export const buildUploadedFile = (
  overrides: Partial<Express.Multer.File> = {},
): Express.Multer.File =>
  ({
    fieldname: "file",
    originalname: "abrigo.png",
    encoding: "7bit",
    mimetype: "image/png",
    size: 2048,
    buffer: Buffer.from("fake"),
    destination: "",
    filename: "abrigo.png",
    path: "",
    stream: undefined as unknown as Express.Multer.File["stream"],
    ...overrides,
  }) as Express.Multer.File;
