import { PagelaEntity } from "../entities/pagela.entity";

const toIso = (value: Date | string): string =>
  value instanceof Date ? value.toISOString() : value;

export class ShelteredMiniDto {
  id: string;
  name: string;
  gender: string;
  birthDate?: string | null;
}

export class MemberMiniDto {
  id: string;
  active: boolean;
  user: {
    id: string;
    name: string;
    email: string;
    phone: string;
  };
}

export class PagelaResponseDto {
  id: string;
  createdAt: string;
  updatedAt: string;

  sheltered: ShelteredMiniDto;
  member: MemberMiniDto;

  referenceDate: string;
  year: number;
  visit: number;

  present: boolean;
  notes: string | null;

  static fromEntity(e: PagelaEntity): PagelaResponseDto {
    return {
      id: e.id,
      createdAt: toIso(e.createdAt),
      updatedAt: toIso(e.updatedAt),
      sheltered: {
        id: e.sheltered?.id,
        name: e.sheltered?.name,
        gender: e.sheltered?.gender,
        birthDate: e.sheltered?.birthDate,
      },
      member: {
        id: e.member?.id,
        active: e.member?.active,
        user: {
          id: e.member?.user?.id,
          name: e.member?.user?.name,
          email: e.member?.user?.email,
          phone: e.member?.user?.phone,
        },
      },
      referenceDate: e.referenceDate,
      year: e.year,
      visit: e.visit,
      present: e.present,
      notes: e.notes ?? null,
    };
  }
}
