import { UserRole } from "../auth.types";

export type ShelterLite = {
  id: string;
  name: string;
};

export type TeacherProfileLite = {
  id: string;
  active: boolean;
  shelter: ShelterLite | null;
};

export type CoordinatorProfileLite = {
  id: string;
  active: boolean;
  shelters: ShelterLite[];
};

export class MeResponseDto {
  id!: string;
  email!: string;
  phone!: string;
  name!: string;
  active!: boolean;
  completed!: boolean;
  commonUser!: boolean;
  role!: UserRole;

  teacherProfile!: TeacherProfileLite | null;
  leaderProfile!: CoordinatorProfileLite | null;
}
