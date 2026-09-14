import { ShelterScheduleEntity } from "src/shelter/schedule/entities/shelter-schedule.entity";
import { TeamEntity } from "src/shelter/team/entities/team.entity";
import { AttendanceCategory } from "../entities/attendance.entity";
import { ATTENDANCE_LOCATION, teamLabel } from "../constants";
import { ScheduleOccurrence } from "../types";

/**
 * Um agendamento gera até **dois** encontros: a visita ao abrigo e a reunião
 * na NIB. Cada um tem data, local e frequência próprios.
 *
 * Essa expansão estava copiada em quatro métodos do serviço de leitura, com
 * as mesmas seis linhas de montagem de rótulo em cada cópia.
 */
export const occurrencesOf = (
  schedule: ShelterScheduleEntity,
  team: TeamEntity,
): ScheduleOccurrence[] => {
  const base = {
    scheduleId: schedule.id,
    visitNumber: schedule.visitNumber,
    lessonContent: schedule.lessonContent,
    observation: schedule.observation,
    teamId: team.id,
    teamNumber: team.numberTeam,
    teamName: teamLabel(team.description, team.numberTeam),
    shelterName: team.shelter?.name ?? "",
  };

  const occurrences: ScheduleOccurrence[] = [];

  if (schedule.visitDate) {
    occurrences.push({
      ...base,
      category: AttendanceCategory.VISIT,
      date: schedule.visitDate,
      location: ATTENDANCE_LOCATION.VISIT(base.shelterName),
    });
  }

  if (schedule.meetingDate) {
    occurrences.push({
      ...base,
      category: AttendanceCategory.MEETING,
      date: schedule.meetingDate,
      location: ATTENDANCE_LOCATION.MEETING(schedule.meetingRoom),
    });
  }

  return occurrences;
};

/** Encontros já realizados, na data de referência. */
export const pastOccurrencesOf = (
  schedule: ShelterScheduleEntity,
  team: TeamEntity,
  today: Date,
): ScheduleOccurrence[] =>
  occurrencesOf(schedule, team).filter(
    (occurrence) => new Date(occurrence.date) < today,
  );

/** Mais recente primeiro. */
export const byDateDesc = <T extends { date: string }>(a: T, b: T): number =>
  new Date(b.date).getTime() - new Date(a.date).getTime();

export const isoDay = (date: Date): string => date.toISOString().slice(0, 10);

/** Só a parte da data: "2026-09-01" ou "2026-09-01T12:00:00Z". */
const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})/;

/**
 * Data de um encontro, no formato brasileiro.
 *
 * `visitDate` é dia puro no banco. `new Date` o lê como meia-noite **UTC** e
 * `toLocaleDateString` o exibe no fuso do servidor — em UTC-4 isso devolvia o
 * dia anterior, e o resumo do relatório pendente saía com a data errada.
 */
export const formatDayBR = (value: string): string => {
  const parts = DATE_ONLY.exec(value);
  if (parts) {
    const [, year, month, day] = parts;
    return `${day}/${month}/${year}`;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime())
    ? value
    : parsed.toLocaleDateString("pt-BR");
};
