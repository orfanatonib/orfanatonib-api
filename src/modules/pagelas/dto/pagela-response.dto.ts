import { PagelaEntity } from '../entities/pagela.entity';

export class ShelteredMiniDto {
  id: string;
  name: string;
  gender: string;
  birthDate: string;
}

export class TeacherMiniDto {
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
  teacher: TeacherMiniDto;

  referenceDate: string;
  year: number;
  visit: number;

  present: boolean;
  notes: string | null;

  static fromEntity(e: PagelaEntity): PagelaResponseDto {
    return {
      id: e.id,
      createdAt: (e as any).createdAt?.toISOString?.() ?? (e as any).createdAt,
      updatedAt: (e as any).updatedAt?.toISOString?.() ?? (e as any).updatedAt,
      sheltered: {
        id: e.sheltered?.id,
        name: e.sheltered?.name,
        gender: e.sheltered?.gender,
        birthDate: e.sheltered?.birthDate,
      },
      teacher: {
        id: e.teacher?.id,
        active: e.teacher?.active,
        user: {
          id: e.teacher?.user?.id,
          name: e.teacher?.user?.name,
          email: e.teacher?.user?.email,
          phone: e.teacher?.user?.phone,
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
