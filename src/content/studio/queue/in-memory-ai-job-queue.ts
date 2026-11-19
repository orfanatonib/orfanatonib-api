import {
  AiJobHandler,
  AiJobQueuePort,
  AiQueueHealth,
  AiQueueJob,
} from "./ai-job-queue.port";
import {
  DEFAULT_RETRY_POLICY,
  decideRetry,
  RetryPolicy,
} from "./provider-retry.utils";

export interface DeadLetter {
  job: AiQueueJob;
  reason: string;
  attempts: number;
}

/**
 * Fila em memória para testes e para o modo `fake`: mesma semântica do contrato
 * (concorrência global, retry com `Retry-After`, dead letter), sem Redis.
 */
export class InMemoryAiJobQueue extends AiJobQueuePort {
  readonly deadLetters: DeadLetter[] = [];
  readonly completed: string[] = [];

  private readonly waiting: Array<{
    job: AiQueueJob;
    attempt: number;
    notBefore: number;
  }> = [];
  private handler: AiJobHandler | null = null;
  private concurrency = 1;
  private running = 0;
  private closed = false;
  private idleWaiters: Array<() => void> = [];

  constructor(
    private readonly policy: RetryPolicy = DEFAULT_RETRY_POLICY,
    private readonly now: () => number = Date.now,
    private readonly random: () => number = () => 0.5,
    /** Agenda o próximo `pump` para quando o retry vencer (os testes injetam um no-op e avançam o relógio à mão). */
    private readonly schedule: (fn: () => void, delayMs: number) => void = (
      fn,
      delayMs,
    ) => {
      setTimeout(fn, delayMs).unref();
    },
  ) {
    super();
  }

  enqueue(job: AiQueueJob): Promise<void> {
    if (this.closed) return Promise.reject(new Error("queue closed"));
    this.waiting.push({ job, attempt: 1, notBefore: this.now() });
    this.pump();
    return Promise.resolve();
  }

  start(handler: AiJobHandler, concurrency: number): void {
    this.handler = handler;
    this.concurrency = Math.min(20, Math.max(1, Math.floor(concurrency)));
    this.pump();
  }

  async close(): Promise<void> {
    this.closed = true;
    if (this.running === 0) return;
    await new Promise<void>((resolve) => this.idleWaiters.push(resolve));
  }

  health(): Promise<AiQueueHealth> {
    return Promise.resolve({
      driver: "memory",
      healthy: !this.closed,
      waiting: this.waiting.length,
      active: this.running,
    });
  }

  /** Avança o relógio lógico: processa o que já pode rodar. Útil com relógio injetado. */
  pump(): void {
    const handler = this.handler;
    if (!handler) return;
    while (this.running < this.concurrency) {
      const index = this.waiting.findIndex(
        (entry) => entry.notBefore <= this.now(),
      );
      if (index === -1) return;
      const [entry] = this.waiting.splice(index, 1);
      this.running++;
      void this.run(handler, entry);
    }
  }

  /** Quantos jobs aguardam (incluindo os reagendados). */
  get pending(): number {
    return this.waiting.length;
  }

  private async run(
    handler: AiJobHandler,
    entry: { job: AiQueueJob; attempt: number },
  ): Promise<void> {
    try {
      const outcome = await handler(entry.job, entry.attempt);
      if (outcome.status === "done") {
        this.completed.push(entry.job.jobId);
      } else if (outcome.status === "failed") {
        this.deadLetters.push({
          job: entry.job,
          reason: outcome.reason,
          attempts: entry.attempt,
        });
      } else {
        const decision = decideRetry(
          entry.attempt,
          outcome.retryAfterMs ?? null,
          this.policy,
          this.random,
        );
        if (decision.retry) {
          this.waiting.push({
            job: entry.job,
            attempt: entry.attempt + 1,
            notBefore: this.now() + decision.delayMs,
          });
          this.schedule(() => this.pump(), decision.delayMs);
        } else {
          this.deadLetters.push({
            job: entry.job,
            reason: `${outcome.reason} (${decision.reason})`,
            attempts: entry.attempt,
          });
        }
      }
    } catch (error: unknown) {
      this.deadLetters.push({
        job: entry.job,
        reason: error instanceof Error ? error.message : String(error),
        attempts: entry.attempt,
      });
    } finally {
      this.running--;
      this.pump();
      if (this.running === 0) {
        this.idleWaiters.splice(0).forEach((resolve) => resolve());
      }
    }
  }
}
