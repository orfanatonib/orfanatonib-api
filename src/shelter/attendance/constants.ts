import { AttendanceCategory } from "./entities/attendance.entity";

/** Rótulo do local, por categoria de encontro. */
export const ATTENDANCE_LOCATION = {
  VISIT: (shelterName: string) => `Abrigo - ${shelterName}`,
  MEETING: (room?: string | null) => `NIB - ${room || "Sem local"}`,
} as const;

export const ATTENDANCE_DEFAULT_CATEGORY = AttendanceCategory.VISIT;

export const ATTENDANCE_PAGE_DEFAULT = 1;
export const ATTENDANCE_LIMIT_DEFAULT = 20;
export const ATTENDANCE_LIMIT_MAX = 100;

export const ATTENDANCE_SORT_COLUMNS = {
  createdAt: "attendance.createdAt",
  visitDate: "schedule.visitDate",
  meetingDate: "schedule.meetingDate",
} as const;

/** Nome exibido de uma equipe sem descrição própria. */
export const teamLabel = (
  description: string | null | undefined,
  numberTeam: number,
): string => description || `Equipe ${numberTeam}`;

/** Endereço resumido do abrigo, usado no resumo de relatório pendente. */
export const shortAddress = (address?: {
  street?: string | null;
  number?: string;
  district?: string | null;
  city?: string;
}): string | undefined =>
  address
    ? `${address.street || ""}, ${address.number || ""} - ${address.district || ""}, ${address.city || ""}`
    : undefined;

export const ATTENDANCE_MESSAGES = {
  USER_NOT_IDENTIFIED: "Usuário não identificado no token.",
  USER_NOT_FOUND: "Usuário não encontrado.",
  TEAM_NOT_FOUND: "Time não encontrado.",
  SCHEDULE_NOT_FOUND: "Evento não encontrado.",
  NOT_TEAM_LEADER: "Você não é líder deste time.",
  NOT_TEAM_MEMBER: "Você não pertence a este time.",
  SCHEDULE_WITHOUT_DATE:
    "Não é possível registrar presença/falta sem data de reunião ou visita válida.",
  SCHEDULE_OTHER_TEAM: "Este evento não pertence ao time informado.",
  MEMBER_NOT_IN_TEAM: (memberId: string) =>
    `Membro ${memberId} não encontrado no time.`,
} as const;

export const AttendanceLogs = {
  REGISTERED: (memberId: string, category: string) =>
    `Frequência registrada para ${memberId} (${category})`,
  TEAM_REGISTERED: (teamId: string, count: number) =>
    `Frequência de equipe registrada: ${teamId}, ${count} registro(s)`,
} as const;
