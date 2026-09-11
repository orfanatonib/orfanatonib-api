export enum EmailOutboxStatus {
  /** Aguardando a próxima passada do worker. */
  PENDING = "pending",
  /** Entregue ao SMTP sem erro. */
  SENT = "sent",
  /** Esgotou as tentativas; não será reenviado sozinho. */
  FAILED = "failed",
  /** Barrado por feature flag: fica registrado, mas não é enviado. */
  SKIPPED = "skipped",
}
