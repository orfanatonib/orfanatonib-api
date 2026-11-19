import { Injectable } from "@nestjs/common";

import { ResourceNotFoundException } from "src/common/exceptions";
import { GENERATION_STREAM } from "../constants";
import { ContentGenerationJobResponseDto } from "../dto/content-generation-job-response.dto";
import { GenerationStreamRepository } from "../repositories/generation-stream.repository";
import {
  isActiveJobStatus,
  jobsSignature,
  latestJobPerStage,
  SseFrame,
} from "../utils/generation-stream.utils";

export interface GenerationStreamClock {
  now(): number;
  sleep(ms: number, signal: AbortSignal): Promise<void>;
}

const realClock: GenerationStreamClock = {
  now: () => Date.now(),
  sleep: (ms, signal) =>
    new Promise((resolve) => {
      if (signal.aborted) return resolve();
      const timer = setTimeout(done, ms);
      function done() {
        signal.removeEventListener("abort", done);
        clearTimeout(timer);
        resolve();
      }
      signal.addEventListener("abort", done, { once: true });
    }),
};

@Injectable()
export class GenerationStreamService {
  constructor(private readonly repository: GenerationStreamRepository) {}

  /**
   * Frames SSE do andamento das gerações de um pacote: o estado atual de cada etapa na primeira leitura e,
   * depois, só quando algo muda. Termina por tempo, por ociosidade ou quando o cliente desconecta (`signal`).
   */
  async *watch(
    packageId: string,
    signal: AbortSignal,
    clock: GenerationStreamClock = realClock,
  ): AsyncGenerator<SseFrame> {
    if (!(await this.repository.packageExists(packageId)))
      throw new ResourceNotFoundException("Pacote de conteúdo não encontrado");

    const startedAt = clock.now();
    let lastSignature: string | null = null;
    let lastHeartbeat = startedAt;
    let lastActiveAt = startedAt;

    while (!signal.aborted) {
      const jobs = latestJobPerStage(
        await this.repository.findJobsOfPackage(packageId),
      );
      const now = clock.now();
      const signature = jobsSignature(jobs);
      if (signature !== lastSignature) {
        lastSignature = signature;
        lastHeartbeat = now;
        yield {
          event: "jobs",
          data: jobs.map((job) =>
            ContentGenerationJobResponseDto.fromEntity(job),
          ),
        };
      } else if (now - lastHeartbeat >= GENERATION_STREAM.heartbeatMs) {
        lastHeartbeat = now;
        yield { comment: "heartbeat" };
      }
      if (jobs.some((job) => isActiveJobStatus(job.status))) lastActiveAt = now;
      if (now - startedAt >= GENERATION_STREAM.maxDurationMs)
        return yield { event: "end", data: { reason: "timeout" } };
      if (now - lastActiveAt >= GENERATION_STREAM.idleMs)
        return yield { event: "end", data: { reason: "idle" } };
      await clock.sleep(GENERATION_STREAM.pollMs, signal);
    }
  }
}
