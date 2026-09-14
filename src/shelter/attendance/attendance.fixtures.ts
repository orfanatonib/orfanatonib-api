import { UserRole } from "src/core/auth/auth.types";
import { UserEntity } from "src/core/user/entities/user.entity";
import { AddressEntity } from "src/shelter/address/entities/address.entity/address.entity";
import { MemberProfileEntity } from "src/shelter/member-profile/entities/member-profile.entity/member-profile.entity";
import { ShelterEntity } from "src/shelter/shelter/entities/shelter.entity/shelter.entity";
import { ShelterScheduleEntity } from "src/shelter/schedule/entities/shelter-schedule.entity";
import { TeamEntity } from "src/shelter/team/entities/team.entity";
import {
  AttendanceCategory,
  AttendanceEntity,
  AttendanceType,
} from "./entities/attendance.entity";
import { AttendanceActor } from "./types";

export const FIXED_CREATED_AT = new Date("2026-01-10T12:30:00.000Z");
export const FIXED_UPDATED_AT = new Date("2026-02-20T08:00:00.000Z");
/** "Hoje" dos testes: as datas abaixo ficam antes ou depois dele. */
export const TODAY = new Date("2026-09-10T00:00:00.000Z");

export const buildActor = (
  overrides: Partial<AttendanceActor> = {},
): AttendanceActor => ({
  userId: "leader-user-id",
  role: UserRole.LEADER,
  ...overrides,
});

export const buildAdminActor = (): AttendanceActor =>
  buildActor({ userId: "admin-user-id", role: UserRole.ADMIN });

export const buildMemberActor = (): AttendanceActor =>
  buildActor({ userId: "member-user-id", role: UserRole.MEMBER });

export const buildUser = (overrides: Partial<UserEntity> = {}): UserEntity =>
  Object.assign(new UserEntity(), {
    id: "member-user-id",
    name: "Maria Souza",
    email: "maria@orfanatonib.test",
    phone: "92999990000",
    active: true,
    completed: true,
    commonUser: false,
    role: UserRole.MEMBER,
    createdAt: FIXED_CREATED_AT,
    updatedAt: FIXED_UPDATED_AT,
    ...overrides,
  });

export const buildAddress = (): AddressEntity =>
  Object.assign(new AddressEntity(), {
    id: "address-id",
    street: "Rua das Flores",
    number: "100",
    district: "Centro",
    city: "Manaus",
    state: "AM",
  });

export const buildShelter = (
  overrides: Partial<ShelterEntity> = {},
): ShelterEntity =>
  Object.assign(new ShelterEntity(), {
    id: "shelter-id",
    name: "Abrigo Esperança",
    address: buildAddress(),
    ...overrides,
  });

export const buildMemberProfile = (user: UserEntity): MemberProfileEntity =>
  Object.assign(new MemberProfileEntity(), {
    id: `profile-${user.id}`,
    active: true,
    user,
  });

export const buildTeam = (overrides: Partial<TeamEntity> = {}): TeamEntity =>
  Object.assign(new TeamEntity(), {
    id: "team-id",
    numberTeam: 1,
    description: undefined,
    shelter: buildShelter(),
    members: [buildMemberProfile(buildUser())],
    ...overrides,
  });

export const buildSchedule = (
  overrides: Partial<ShelterScheduleEntity> = {},
): ShelterScheduleEntity =>
  Object.assign(new ShelterScheduleEntity(), {
    id: "schedule-id",
    visitNumber: 3,
    visitDate: "2026-09-01",
    meetingDate: "2026-09-02",
    lessonContent: "Lição da semana",
    observation: undefined,
    meetingRoom: "Sala 2",
    team: buildTeam(),
    createdAt: FIXED_CREATED_AT,
    updatedAt: FIXED_UPDATED_AT,
    ...overrides,
  });

export const buildAttendance = (
  overrides: Partial<AttendanceEntity> = {},
): AttendanceEntity =>
  Object.assign(new AttendanceEntity(), {
    id: "attendance-id",
    member: buildUser(),
    shelterSchedule: buildSchedule(),
    category: AttendanceCategory.VISIT,
    type: AttendanceType.PRESENT,
    comment: undefined,
    createdAt: FIXED_CREATED_AT,
    updatedAt: FIXED_UPDATED_AT,
    ...overrides,
  });
