import { AcceptedChristShortDto } from "src/shelter/accepted-christ/dto/accepted-christ-short.dto";
import { ShelteredGender } from "../enums/sheltered-gender.enum";

export class ShelteredAddressResponseDto {
  id: string;
  street?: string | null;
  number?: string;
  district?: string | null;
  city: string;
  state: string;
  postalCode?: string | null;
  complement?: string;
}

export class ShelteredShelterResponseDto {
  id: string;
  name: string;
}

export class ShelteredListItemDto {
  id: string;
  name: string;
  guardianName?: string | null;
  gender: ShelteredGender;
  guardianPhone?: string | null;
  shelterId: string | null;
  active: boolean;
  acceptedChrists: AcceptedChristShortDto[];
}

export class ShelteredResponseDto {
  id: string;
  name: string;
  gender: ShelteredGender;
  birthDate: string | null;
  guardianName?: string | null;
  guardianPhone?: string | null;
  joinedAt: string | null;
  active: boolean;
  shelter: ShelteredShelterResponseDto | null;
  address: ShelteredAddressResponseDto | null;
  createdAt: string;
  updatedAt: string;
}
