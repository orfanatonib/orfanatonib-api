import { ContentGenerationJobStatus } from "../enums/content-generation-job-status.enum";

export type SseFrame =
  | { event: "jobs"; data: unknown }
  | { event: "end"; data: { reason: "timeout" | "idle" } }
  | { comment: string };

const ACTIVE: readonly ContentGenerationJobStatus[] = [
  ContentGenerationJobStatus.PENDING,
  ContentGenerationJobStatus.RUNNING,
  ContentGenerationJobStatus.RETRY_SCHEDULED,
];

export interface JobLike {
  id: string;
  stageId: string;
  status: ContentGenerationJobStatus;
  attempts: number;
  updatedAt: Date | string;
}

export const isActiveJobStatus = (
  status: ContentGenerationJobStatus,
): boolean => ACTIVE.includes(status);

/** Último job de cada etapa (a lista chega do mais novo para o mais antigo). */
export function latestJobPerStage<T extends { stageId: string }>(
  jobs: readonly T[],
): T[] {
  const seen = new Set<string>();
  return jobs.filter((job) => {
    if (seen.has(job.stageId)) return false;
    seen.add(job.stageId);
    return true;
  });
}

/** Assinatura do estado: só emitimos quando ela muda. */
export function jobsSignature(jobs: readonly JobLike[]): string {
  return jobs
    .map(
      (job) =>
        `${job.id}:${job.status}:${job.attempts}:${new Date(job.updatedAt).getTime()}`,
    )
    .sort()
    .join("|");
}

/** Formata um frame no protocolo SSE (`data` em JSON de uma linha). */
export function formatSseFrame(frame: SseFrame): string {
  if ("comment" in frame)
    return `: ${frame.comment.replace(/[\r\n]+/g, " ")}\n\n`;
  return `event: ${frame.event}\ndata: ${JSON.stringify(frame.data)}\n\n`;
}
