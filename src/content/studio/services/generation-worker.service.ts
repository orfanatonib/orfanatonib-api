import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import { AiJobQueuePort } from "../queue/ai-job-queue.port";
import { ContentGenerationRepository } from "../repositories/content-generation.repository";
import { ProcessGenerationJobService } from "./process-generation-job.service";

const RECONCILE_INTERVAL_MS = 60_000;

/**
 * Liga o consumidor da fila ao processador e reenfileira o que ficou para trás
 * (boot e a cada minuto): job PENDING sem entrada na fila, RETRY_SCHEDULED e
 * RUNNING com lease vencido. O banco é a fonte da verdade; a fila é só o gatilho.
 */
@Injectable()
export class GenerationWorkerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(GenerationWorkerService.name);
  private timer: NodeJS.Timeout | null = null;

  constructor(
    private readonly queue: AiJobQueuePort,
    private readonly processor: ProcessGenerationJobService,
    private readonly packages: ContentGenerationRepository,
    private readonly config: ConfigService,
  ) {}

  onModuleInit(): void {
    if (this.config.get<string>("CS_QUEUE_DISABLED") === "true") return;
    const concurrency = Number(
      this.config.get<string>("CS_QUEUE_CONCURRENCY") ?? 2,
    );
    this.queue.start((job) => this.processor.handle(job), concurrency);
    void this.reconcile();
    this.timer = setInterval(
      () => void this.reconcile(),
      RECONCILE_INTERVAL_MS,
    );
    this.timer.unref();
  }

  async onModuleDestroy(): Promise<void> {
    if (this.timer) clearInterval(this.timer);
    await this.queue.close();
  }

  async reconcile(): Promise<number> {
    try {
      const jobs = await this.packages.findRecoverableGenerationJobs(
        new Date(),
      );
      for (const job of jobs) await this.queue.enqueue({ jobId: job.id });
      if (jobs.length)
        this.logger.log(`Reenfileirados ${jobs.length} jobs de geração`);
      return jobs.length;
    } catch (error: unknown) {
      this.logger.warn(
        `Reconciliação de jobs falhou: ${error instanceof Error ? error.message : String(error)}`,
      );
      return 0;
    }
  }
}
