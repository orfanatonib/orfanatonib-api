import { UserRole } from "src/core/auth/auth.types";
import { UserEntity } from "src/core/user/entities/user.entity";
import { AttendanceCategory } from "./entities/attendance.entity";

/**
 * Escopo do ator, resolvido a partir da requisição autenticada.
 * Nunca vem de dado enviado pelo cliente.
 */
export interface AttendanceActor {
  readonly userId: string;
  readonly role: UserRole | null;
}

/** Equipes que o ator alcança, já resolvidas uma única vez. */
export interface AttendanceScope {
  readonly actor: AttendanceActor;
  /** O usuário já carregado: evita relê-lo para montar a resposta. */
  readonly user: UserEntity;
  readonly isAdmin: boolean;
  /** Equipes que ele lidera. Vazio para admin, que enxerga todas. */
  readonly leaderTeamIds: readonly string[];
  /** Equipes das quais é membro. */
  readonly memberTeamIds: readonly string[];
}

/** Um encontro: a visita e a reunião de um mesmo agendamento são distintos. */
export interface ScheduleOccurrence {
  readonly scheduleId: string;
  readonly category: AttendanceCategory;
  readonly date: string;
  readonly visitNumber: number;
  readonly lessonContent: string;
  readonly observation?: string;
  readonly location: string;
  readonly teamId: string;
  readonly teamNumber: number;
  readonly teamName: string;
  readonly shelterName: string;
}

export interface AttendanceRecordsFilters {
  page: number;
  limit: number;
  startDate?: string;
  endDate?: string;
  type?: string;
  category?: AttendanceCategory;
  teamId?: string;
  memberId?: string;
  scheduleId?: string;
  memberName?: string;
  sortBy: keyof typeof import("./constants").ATTENDANCE_SORT_COLUMNS;
  sortOrder: "ASC" | "DESC";
}
