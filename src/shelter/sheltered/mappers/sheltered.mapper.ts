import { ShelteredEntity } from '../entities/sheltered.entity';
import {
  AddressResponseDto,
  ShelteredListItemDto,
  ShelteredResponseDto,
} from '../dto/sheltered-response.dto';
import { AcceptedChristShortDto } from 'src/shelter/accepted-christ/dtos/accepted-christ-short.dto';

const dateOnly = (v: unknown): string | null => {
  if (v === null || v === undefined) return null;

  const s = String(v).trim();
  const m = s.match(/^(\d{4}-\d{2}-\d{2})$/);
  if (m) return m[1];

  if (v instanceof Date && !isNaN(v.getTime())) {
    return v.toISOString().slice(0, 10);
  }

  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
};

const toIsoDateTime = (v: unknown): string => {
  const s = String(v);
  if (/\d{4}-\d{2}-\d{2}T/.test(s)) return s;
  const d = v instanceof Date ? v : new Date(s);
  return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
};


export const toShelteredListItemDto = (e: ShelteredEntity): ShelteredListItemDto => ({
  id: e.id,
  name: e.name,
  guardianName: e.guardianName,
  gender: e.gender,
  guardianPhone: e.guardianPhone,
  shelterId: e.shelter?.id ?? null,
  active: e.active ?? true,
  acceptedChrists: (e.acceptedChrists ?? []).map((a): AcceptedChristShortDto => ({
    id: a.id,
    decision: a.decision,
    createdAt: a.createdAt.toISOString(),
    updatedAt: a.updatedAt.toISOString(),
  })),
});

export const toAddressDto = (a: any): AddressResponseDto | null => {
  if (!a) return null;
  return {
    id: a.id,
    street: a.street,
    number: a.number ?? undefined,
    district: a.district,
    city: a.city,
    state: a.state,
    postalCode: a.postalCode,
    complement: a.complement ?? undefined,
  };
};

export const toShelteredResponseDto = (e: ShelteredEntity): ShelteredResponseDto => ({
  id: (e as any).id,
  name: e.name,
  birthDate: dateOnly((e as any).birthDate)!,
  guardianName: e.guardianName,
  gender: e.gender,
  guardianPhone: e.guardianPhone,
  joinedAt: dateOnly((e as any).joinedAt),
  active: e.active ?? true,
  shelter: (e as any).shelter
    ? {
      id: (e as any).shelter.id,
      name: (e as any).shelter.name,
    }
    : null,
  address: toAddressDto((e as any).address),
  createdAt: toIsoDateTime((e as any).createdAt),
  updatedAt: toIsoDateTime((e as any).updatedAt),
});