import { UserRole } from "../auth.types";

/**
 * Resposta de `GET /auth/me`.
 *
 * O arquivo anterior descrevia uma resposta que o endpoint nunca devolveu
 * (`shelters: ShelterLite[]` no perfil de líder, sem imagem, sem dados
 * pessoais, sem preferências) e não era importado por ninguém. Esta é a forma
 * que o `authSlice` do frontend consome.
 */

export class MediaResponseDto {
  id!: string;
  title!: string;
  description!: string;
  url!: string;
  uploadType!: string;
  mediaType!: string;
  isLocalFile!: boolean;
  platformType?: string;
  originalName?: string;
  size?: number;
  createdAt!: Date;
  updatedAt!: Date;
}

export class AddressLiteDto {
  id!: string;
  street?: string | null;
  number?: string;
  district?: string | null;
  city!: string;
  state!: string;
  postalCode?: string | null;
  createdAt!: Date;
  updatedAt!: Date;
}

export class ShelterLiteDto {
  id!: string;
  name!: string;
  description?: string;
  teamsQuantity?: number;
  address!: AddressLiteDto | null;
  createdAt!: Date;
  updatedAt!: Date;
}

export class TeamLiteDto {
  id!: string;
  numberTeam!: number;
  description?: string;
  shelter!: ShelterLiteDto | null;
  createdAt!: Date;
  updatedAt!: Date;
}

export class MemberProfileLiteDto {
  id!: string;
  active!: boolean;
  team!: TeamLiteDto | null;
  createdAt!: Date;
  updatedAt!: Date;
}

export class LeaderProfileLiteDto {
  id!: string;
  active!: boolean;
  teams!: TeamLiteDto[];
  createdAt!: Date;
  updatedAt!: Date;
}

export class PersonalDataLiteDto {
  birthDate?: string;
  gender?: string;
  gaLeaderName?: string;
  gaLeaderContact?: string;
}

export class PreferencesLiteDto {
  loveLanguages?: string;
  temperaments?: string;
  favoriteColor?: string;
  favoriteFood?: string;
  favoriteMusic?: string;
  whatMakesYouSmile?: string;
  skillsAndTalents?: string;
}

export class MeResponseDto {
  id!: string;
  email!: string;
  phone!: string;
  name!: string;
  role!: UserRole;
  commonUser!: boolean;
  image!: MediaResponseDto | null;
  personalData?: PersonalDataLiteDto;
  preferences?: PreferencesLiteDto;
  memberProfile!: MemberProfileLiteDto | null;
  leaderProfile!: LeaderProfileLiteDto | null;
}
