import { AcceptedChristShortDto } from "src/modules/accepted-christs/dtos/accepted-christ-short.dto";

export class ShelteredListItemDto {
  id: string;
  name: string;
  guardianName?: string | null;
  gender: string;
  guardianPhone?: string | null;
  shelterId?: string | null;
  active: boolean;
  acceptedChrists?: AcceptedChristShortDto[];
}

export class AddressResponseDto {
  id: string;
  street: string;
  number?: string;
  district: string;
  city: string;
  state: string;
  postalCode: string;
  complement?: string;
}

export class PagelaMiniDto {
  id: string;
  year: number;
  visit: number;
  referenceDate: string;
  present: boolean;
  notes?: string | null;
}

export class ShelteredResponseDto {
  id: string;
  name: string;
  birthDate: string;
  guardianName?: string | null;
  gender: string;
  guardianPhone?: string | null;
  joinedAt?: string | null;
  active: boolean;
  shelter?: { id: string; name: string } | null;
  address?: AddressResponseDto | null;
  pagelas?: PagelaMiniDto[];
  createdAt: string;
  updatedAt: string;
}

export class PaginatedResponseDto<T> {
  data: T[];
  meta: {
    page: number;
    limit: number;
    totalItems: number;
    totalPages: number;
    orderBy?: string;
    order?: 'ASC' | 'DESC';
  };
}