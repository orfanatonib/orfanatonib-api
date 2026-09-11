/** Quanto tempo depois da visita o lembrete é disparado. */
export const REMINDER_GRACE_DAYS = 2;

/** Até onde olhar para trás; visita antiga não gera cobrança nova. */
export const REMINDER_LOOKBACK_DAYS = 30;

export const ReminderLogs = {
  VISIT_REPORT_START: "Lembretes: verificando relatórios de visita pendentes",
  VISIT_REPORT_DONE: (count: number) =>
    `Lembretes: ${count} relatório(s) de visita pendente(s)`,
  PAGELA_START: "Lembretes: verificando pagelas pendentes",
  PAGELA_DONE: (count: number) =>
    `Lembretes: ${count} abrigo(s) com pagela pendente`,
  FAILED: (kind: string, reason: string) =>
    `Lembretes: falha ao processar ${kind} — ${reason}`,
} as const;

/**
 * Uma cobrança por visita e por destinatário. A chave entra no outbox e é o
 * que impede o agendador de repetir o mesmo aviso todo dia.
 */
export const visitReportDedupeKey = (
  scheduleId: string,
  email: string,
): string => `visit-report-reminder:${scheduleId}:${email}`;

export const pagelaDedupeKey = (
  shelterId: string,
  year: number,
  visit: number,
  email: string,
): string => `pagela-reminder:${shelterId}:${year}:${visit}:${email}`;
