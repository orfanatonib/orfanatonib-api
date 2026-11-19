import { DelayedError, Job, Queue, UnrecoverableError, Worker } from "bullmq";
import IORedis from "ioredis";

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

export const STUDIO_QUEUE_NAME = "content-studio-generation";
/** Prefixo das chaves no Redis: o Redis é compartilhado com outras aplicações, então nada aqui colide com elas. */
export const STUDIO_QUEUE_PREFIX = "orfanato:studio";

interface QueuePayload {
  jobId: string;
  /** Tentativa atual (1 = primeira); o BullMQ só guarda o payload, a política de retry é a nossa. */
  attempt?: number;
}

export interface BullMqQueueOptions {
  redisUrl: string;
  prefix?: string;
  queueName?: string;
  policy?: RetryPolicy;
  random?: () => number;
}

/**
 * Fila do Estúdio no BullMQ/Redis: compartilhada entre instâncias, com concorrência GLOBAL limitada e jobs
 * que sobrevivem a deploy. O id do job é o do MySQL (a fonte da verdade); reenfileirar o mesmo id enquanto ele
 * já está na fila é inofensivo (o BullMQ ignora a duplicata), então o reconciliador pode rodar à vontade.
 */
export class BullMqAiJobQueue extends AiJobQueuePort {
  private readonly connection: IORedis;
  private readonly queue: Queue<QueuePayload>;
  private worker: Worker<QueuePayload> | null = null;
  private workerConnection: IORedis | null = null;
  private readonly policy: RetryPolicy;
  private readonly random: () => number;
  private readonly prefix: string;
  private readonly queueName: string;
  private closed = false;

  constructor(private readonly options: BullMqQueueOptions) {
    super();
    this.prefix = options.prefix ?? STUDIO_QUEUE_PREFIX;
    this.queueName = options.queueName ?? STUDIO_QUEUE_NAME;
    this.policy = options.policy ?? DEFAULT_RETRY_POLICY;
    this.random = options.random ?? Math.random;
    // `maxRetriesPerRequest: null` é exigido pelo Worker; sem Redis a API não deve travar o boot.
    this.connection = new IORedis(options.redisUrl, {
      maxRetriesPerRequest: null,
      lazyConnect: false,
      enableOfflineQueue: true,
    });
    this.connection.on("error", () => undefined);
    this.queue = new Queue<QueuePayload>(this.queueName, {
      connection: this.connection,
      prefix: this.prefix,
      defaultJobOptions: {
        removeOnComplete: true,
        removeOnFail: true,
        attempts: 1,
      },
    });
  }

  async enqueue(job: AiQueueJob): Promise<void> {
    if (this.closed) throw new Error("queue closed");
    await this.queue.add(
      "generate",
      { jobId: job.jobId, attempt: 1 },
      { jobId: job.jobId },
    );
  }

  start(handler: AiJobHandler, concurrency: number): void {
    const limit = Math.min(20, Math.max(1, Math.floor(concurrency)));
    // Limite GLOBAL (todas as instâncias), além da concorrência local do worker.
    void this.queue.setGlobalConcurrency(limit).catch(() => undefined);
    this.workerConnection = this.connection.duplicate({
      maxRetriesPerRequest: null,
    });
    this.workerConnection.on("error", () => undefined);
    this.worker = new Worker<QueuePayload>(
      this.queueName,
      async (job: Job<QueuePayload>, token?: string) => {
        const attempt = job.data.attempt ?? 1;
        const outcome = await handler({ jobId: job.data.jobId }, attempt);
        if (outcome.status === "done") return;
        if (outcome.status === "failed")
          throw new UnrecoverableError(outcome.reason);
        const decision = decideRetry(
          attempt,
          outcome.retryAfterMs ?? null,
          this.policy,
          this.random,
        );
        if (!decision.retry)
          throw new UnrecoverableError(
            `${outcome.reason} (${decision.reason})`,
          );
        await job.updateData({ ...job.data, attempt: attempt + 1 });
        await job.moveToDelayed(Date.now() + decision.delayMs, token);
        throw new DelayedError();
      },
      {
        connection: this.connection.duplicate({ maxRetriesPerRequest: null }),
        prefix: this.prefix,
        concurrency: limit,
      },
    );
    this.worker.on("error", () => undefined);
  }

  async close(): Promise<void> {
    this.closed = true;
    await this.worker?.close(true);
    await this.queue.close();
    await Promise.allSettled([
      this.workerConnection?.quit(),
      this.connection.quit(),
    ]);
  }

  async health(): Promise<AiQueueHealth> {
    try {
      await this.connection.ping();
      const counts = await this.queue.getJobCounts(
        "waiting",
        "active",
        "delayed",
      );
      return {
        driver: "bullmq",
        healthy: true,
        waiting: (counts.waiting ?? 0) + (counts.delayed ?? 0),
        active: counts.active ?? 0,
      };
    } catch (error: unknown) {
      return {
        driver: "bullmq",
        healthy: false,
        waiting: 0,
        active: 0,
        reason: error instanceof Error ? error.message : String(error),
      };
    }
  }
}
