/** Porta da fila de jobs de IA: só o id do job trafega; o payload fica no MySQL. */
export interface AiQueueJob {
  jobId: string;
}

export type AiJobOutcome =
  | { status: "done" }
  /** Falha transitória (429/rede): a fila reagenda; `retryAfterMs` é a dica do provedor. */
  | { status: "retry"; retryAfterMs?: number | null; reason: string }
  /** Falha definitiva: não reagenda. */
  | { status: "failed"; reason: string };

export type AiJobHandler = (
  job: AiQueueJob,
  attempt: number,
) => Promise<AiJobOutcome>;

export abstract class AiJobQueuePort {
  /** Enfileira o id do job. Deve ser chamado só DEPOIS do commit da transação que criou o job. */
  abstract enqueue(job: AiQueueJob): Promise<void>;

  /** Registra o consumidor com concorrência global limitada. */
  abstract start(handler: AiJobHandler, concurrency: number): void;

  /** Espera os jobs em andamento terminarem e para de aceitar novos. */
  abstract close(): Promise<void>;
}
