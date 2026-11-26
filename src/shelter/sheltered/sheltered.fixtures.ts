import { AddressEntity } from "src/shelter/address/entities/address.entity/address.entity";
import { ShelterEntity } from "src/shelter/shelter/entities/shelter.entity/shelter.entity";
import { AcceptedChristEntity } from "src/shelter/accepted-christ/entities/accepted-christ.entity";
import { DecisionType } from "src/shelter/accepted-christ/enums/decision-type.enum";
import { UserRole } from "src/core/auth/auth.types";
import { SortOrder } from "src/shared/enums/sort-order.enum";
import { ShelteredEntity } from "./entities/sheltered.entity";
import { ShelteredGender } from "./enums/sheltered-gender.enum";
import { ShelteredOrderBy } from "./enums/sheltered-order-by.enum";
import { ShelteredActiveFilter } from "./enums/sheltered-active-filter.enum";
import { AcceptedJesusFilter } from "./enums/accepted-jesus-filter.enum";
import { CreateShelteredDto } from "./dto/create-sheltered.dto";
import { UpdateShelteredDto } from "./dto/update-sheltered.dto";
import { QueryShelteredDto } from "./dto/query-sheltered.dto";
import { QueryShelteredSimpleDto } from "./dto/query-sheltered-simple.dto";
import { ShelteredAccessContext } from "./types";

export const FIXED_CREATED_AT = new Date("2026-01-10T12:30:00.000Z");
export const FIXED_UPDATED_AT = new Date("2026-02-20T08:00:00.000Z");

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

export const buildShelterEntity = (
  overrides: Partial<ShelterEntity> = {},
): ShelterEntity =>
  Object.assign(new ShelterEntity(), {
    id: "shelter-id",
    name: "Abrigo Esperança",
    createdAt: FIXED_CREATED_AT,
    updatedAt: FIXED_UPDATED_AT,
    ...overrides,
  });

export const buildAcceptedChristEntity = (
  overrides: Partial<AcceptedChristEntity> = {},
): AcceptedChristEntity =>
  Object.assign(new AcceptedChristEntity(), {
    id: "accepted-christ-id",
    decision: DecisionType.ACCEPTED,
    createdAt: FIXED_CREATED_AT,
    updatedAt: FIXED_UPDATED_AT,
    ...overrides,
  });

export const buildShelteredEntity = (
  overrides: Partial<ShelteredEntity> = {},
): ShelteredEntity =>
  Object.assign(new ShelteredEntity(), {
    id: "sheltered-id",
    name: "Maria Silva",
    gender: ShelteredGender.FEMALE,
    guardianName: "Joana Silva",
    guardianPhone: "92999990000",
    birthDate: "2015-04-02",
    joinedAt: "2024-08-01",
    active: true,
    shelter: buildShelterEntity(),
    address: buildAddressEntity(),
    pagelas: [],
    acceptedChrists: [],
    createdAt: FIXED_CREATED_AT,
    updatedAt: FIXED_UPDATED_AT,
    ...overrides,
  });

export const buildAdminContext = (
  overrides: Partial<ShelteredAccessContext> = {},
): ShelteredAccessContext => ({
  userId: "admin-user-id",
  role: UserRole.ADMIN,
  ...overrides,
});

export const buildLeaderContext = (
  overrides: Partial<ShelteredAccessContext> = {},
): ShelteredAccessContext => ({
  userId: "leader-user-id",
  role: UserRole.LEADER,
  ...overrides,
});

export const buildCreateShelteredDto = (
  overrides: Partial<CreateShelteredDto> = {},
): CreateShelteredDto => ({
  name: "Maria Silva",
  gender: ShelteredGender.FEMALE,
  birthDate: "2015-04-02",
  guardianName: "Joana Silva",
  guardianPhone: "92999990000",
  joinedAt: "2024-08-01",
  shelterId: "shelter-id",
  ...overrides,
});

export const buildUpdateShelteredDto = (
  overrides: Partial<UpdateShelteredDto> = {},
): UpdateShelteredDto => ({ ...overrides });

export const buildQueryShelteredDto = (
  overrides: Partial<QueryShelteredDto> = {},
): QueryShelteredDto =>
  Object.assign(new QueryShelteredDto(), {
    page: 1,
    limit: 20,
    orderBy: ShelteredOrderBy.NAME,
    order: SortOrder.ASC,
    ...overrides,
  });

export const buildQueryShelteredSimpleDto = (
  overrides: Partial<QueryShelteredSimpleDto> = {},
): QueryShelteredSimpleDto =>
  Object.assign(new QueryShelteredSimpleDto(), {
    page: 1,
    limit: 20,
    acceptedJesus: AcceptedJesusFilter.ALL,
    active: ShelteredActiveFilter.ALL,
    ...overrides,
  });
