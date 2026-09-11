/** Uma visita que já aconteceu e ainda não tem relatório. */
export interface PendingVisitReport {
  scheduleId: string;
  visitNumber: number;
  visitDate: string;
  shelterId: string;
  shelterName: string;
  teamId: string;
}

/** Um abrigo com acolhidos sem pagela lançada para a visita. */
export interface PendingPagelaGroup {
  shelterId: string;
  shelterName: string;
  teamId: string;
  year: number;
  visit: number;
  pendingCount: number;
}

/** Quem deve receber a cobrança. */
export interface ReminderRecipient {
  userId: string;
  name: string;
  email: string;
}
