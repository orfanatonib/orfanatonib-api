import { AddressEntity } from "src/shelter/address/entities/address.entity/address.entity";
import { AcceptedChristShortDto } from "src/shelter/accepted-christ/dto/accepted-christ-short.dto";
import { ShelteredEntity } from "../entities/sheltered.entity";
import {
  ShelteredAddressResponseDto,
  ShelteredListItemDto,
  ShelteredResponseDto,
  ShelteredShelterResponseDto,
} from "../dto/sheltered-response.dto";
import { toDateOnly, toIsoDateTime } from "../utils/sheltered-date.util";

export const toShelteredAddressDto = (
  address: AddressEntity | null | undefined,
): ShelteredAddressResponseDto | null => {
  if (!address) return null;

  return {
    id: address.id,
    street: address.street ?? null,
    number: address.number,
    district: address.district ?? null,
    city: address.city,
    state: address.state,
    postalCode: address.postalCode ?? null,
    complement: address.complement,
  };
};

const toShelterSummaryDto = (
  entity: ShelteredEntity,
): ShelteredShelterResponseDto | null =>
  entity.shelter ? { id: entity.shelter.id, name: entity.shelter.name } : null;

const toAcceptedChristShortDtos = (
  entity: ShelteredEntity,
): AcceptedChristShortDto[] =>
  (entity.acceptedChrists ?? []).map((acceptedChrist) => ({
    id: acceptedChrist.id,
    decision: acceptedChrist.decision,
    createdAt: toIsoDateTime(acceptedChrist.createdAt),
    updatedAt: toIsoDateTime(acceptedChrist.updatedAt),
  }));

export const toShelteredListItemDto = (
  entity: ShelteredEntity,
): ShelteredListItemDto => ({
  id: entity.id,
  name: entity.name,
  guardianName: entity.guardianName,
  gender: entity.gender,
  guardianPhone: entity.guardianPhone,
  shelterId: entity.shelter?.id ?? null,
  active: entity.active ?? true,
  acceptedChrists: toAcceptedChristShortDtos(entity),
});

export const toShelteredResponseDto = (
  entity: ShelteredEntity,
): ShelteredResponseDto => ({
  id: entity.id,
  name: entity.name,
  gender: entity.gender,
  birthDate: toDateOnly(entity.birthDate),
  guardianName: entity.guardianName,
  guardianPhone: entity.guardianPhone,
  joinedAt: toDateOnly(entity.joinedAt),
  active: entity.active ?? true,
  shelter: toShelterSummaryDto(entity),
  address: toShelteredAddressDto(entity.address),
  createdAt: toIsoDateTime(entity.createdAt),
  updatedAt: toIsoDateTime(entity.updatedAt),
});
