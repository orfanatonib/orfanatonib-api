import { UserEntity } from "src/core/user/entities/user.entity";
import { TeamEntity } from "src/shelter/team/entities/team.entity";
import { AttendanceEntity } from "../entities/attendance.entity";
import {
  AttendanceRecordDto,
  AttendanceResponseDto,
  PendingMemberDto,
} from "../dto/attendance-response.dto";
import { teamLabel } from "../constants";

/** Usuários de uma equipe, sem os perfis vazios. */
export const memberUsersOf = (team: TeamEntity): UserEntity[] =>
  (team.members ?? []).map((profile) => profile.user).filter((user) => !!user);

export const toPendingMemberDto = (user: UserEntity): PendingMemberDto => ({
  memberId: user.id,
  memberName: user.name,
  memberEmail: user.email,
  role: "member",
});

/** Registro completo, com os dados do encontro — usado no PDF e na listagem. */
export const toAttendanceResponseDto = (
  entity: AttendanceEntity,
): AttendanceResponseDto => {
  const schedule = entity.shelterSchedule;
  const team = schedule.team;

  return {
    id: entity.id,
    type: entity.type,
    category: entity.category,
    comment: entity.comment,
    memberId: entity.member.id,
    memberName: entity.member.name,
    memberEmail: entity.member.email,
    scheduleId: schedule.id,
    visitNumber: schedule.visitNumber,
    visitDate: schedule.visitDate,
    meetingDate: schedule.meetingDate,
    lessonContent: schedule.lessonContent,
    observation: schedule.observation,
    meetingRoom: schedule.meetingRoom,
    teamName: teamLabel(team?.description, team?.numberTeam ?? 0),
    shelterName: team?.shelter?.name ?? "",
    createdAt: entity.createdAt,
    updatedAt: entity.updatedAt,
  };
};

/** Registro enxuto, para dentro de um encontro que já traz o contexto. */
export const toAttendanceRecordDto = (
  entity: AttendanceEntity,
): AttendanceRecordDto => ({
  id: entity.id,
  type: entity.type,
  category: entity.category,
  comment: entity.comment,
  memberId: entity.member.id,
  memberName: entity.member.name,
  memberEmail: entity.member.email,
  createdAt: entity.createdAt,
  updatedAt: entity.updatedAt,
});
