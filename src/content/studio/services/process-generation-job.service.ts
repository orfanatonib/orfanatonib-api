import { createHash, randomUUID } from "crypto";

import { Injectable, Logger } from "@nestjs/common";

import { AiGenerationGateway } from "../ai/ai-generation.gateway";
import { AiGenerationCapability } from "../ai/enums/ai-generation-capability.enum";
import { AiProviderErrorKind } from "../ai/enums/ai-provider-error-kind.enum";
import { AiProviderRequestError } from "../ai/openai-generation.gateway";
import {
  GENERATION_LEASE_MS,
  GENERATION_WORKER_PREFIX,
} from "../ai/stage-generation.constants";
import { buildStageRequest } from "../ai/generation/stage-prompt.builder";
import {
  StageOutputError,
  validateStageOutput,
} from "../ai/generation/stage-output.validator";
import { validateStructuredContent } from "../ai/utils/structured-content-policy.util";
import { CONTENT_STUDIO_CATALOG_VERSION } from "../constants";
import { AiJobOutcome, AiQueueJob } from "../queue/ai-job-queue.port";
import {
  DEFAULT_RETRY_POLICY,
  RetryPolicy,
} from "../queue/provider-retry.utils";
import { ContentGenerationRepository } from "../repositories/content-generation.repository";
import { ContentStageContentRepository } from "../repositories/content-stage-content.repository";

const RETRYABLE_KINDS: ReadonlySet<AiProviderErrorKind> = new Set([
  AiProviderErrorKind.RATE_LIMIT,
  AiProviderErrorKind.TIMEOUT,
  AiProviderErrorKind.SERVER,
  AiProviderErrorKind.NETWORK,
  AiProviderErrorKind.UNKNOWN,
]);

@Injectable()
export class ProcessGenerationJobService {
  private readonly logger = new Logger(ProcessGenerationJobService.name);
  private readonly workerId = `${GENERATION_WORKER_PREFIX}-${randomUUID().slice(0, 8)}`;

  constructor(
    private readonly generations: ContentGenerationRepository,
    private readonly stageContents: ContentStageContentRepository,
    private readonly gateway: AiGenerationGateway,
  ) {}

  private readonly policy: RetryPolicy = DEFAULT_RETRY_POLICY;

  /**
   * Carrega o job do MySQL (a fila só traz o id), chama o provedor, valida a
   * saída e grava versão + job concluído numa única transação. Job já concluído
   * ou cancelado é descartado sem custo (ack).
   */
  async handle(queued: AiQueueJob): Promise<AiJobOutcome> {
    const job = await this.generations.startGenerationJob(
      queued.jobId,
      this.workerId,
      GENERATION_LEASE_MS,
    );
    if (!job) return { status: "done" };

    try {
      if (job.capability !== AiGenerationCapability.TEXT_STRUCTURED) {
        throw new AiProviderRequestError(AiProviderErrorKind.SCHEMA);
      }

      const context = await this.generations.loadStageGenerationContext(
        job.stageId,
      );
      if (!context)
        throw new AiProviderRequestError(AiProviderErrorKind.SCHEMA);

      // Prompt e esquema por etapa E por público (bebê, criança, adolescente, adulto).
      const built = buildStageRequest(context);
      const result = await this.gateway.generateStructuredText({
        correlationId: job.jobId,
        instructions: built.instructions,
        input: built.input,
        outputSchema: built.outputSchema,
      });

      const { content, internal } = validateStageOutput(
        context.stageType,
        context.audience,
        result.output,
      );
      const serialized = validateStructuredContent(content);
      await this.stageContents.saveStageContent({
        packageId: job.packageId,
        stageId: job.stageId,
        structuredContent: content,
        contentChecksum: createHash("sha256").update(serialized).digest("hex"),
        templateVersion: CONTENT_STUDIO_CATALOG_VERSION,
        generationSnapshot: {
          provider: result.provider,
          model: result.model,
          usage: result.usage,
          durationMs: result.durationMs,
          attempts: job.attempts,
          jobId: job.jobId,
          stageType: context.stageType,
          audience: context.audience,
          promptVersion: built.promptVersion,
          // Notas internas do modelo (conferência humana): ficam aqui, fora do conteúdo editável.
          reviewerNotes: internal.reviewerNotes ?? "",
          centralMessage: internal.centralMessage ?? "",
        },
        createdById: job.requestedById,
        completedJobId: job.jobId,
      });
      return { status: "done" };
    } catch (error: unknown) {
      return this.onFailure(job.jobId, job.attempts, error);
    }
  }

  private async onFailure(
    jobId: string,
    attempts: number,
    error: unknown,
  ): Promise<AiJobOutcome> {
    const kind =
      error instanceof AiProviderRequestError
        ? error.kind
        : AiProviderErrorKind.UNKNOWN;
    // Saída fora do esquema/regras do público pode ser variação do modelo: vale tentar de novo.
    const retry =
      (RETRYABLE_KINDS.has(kind) || error instanceof StageOutputError) &&
      attempts < this.policy.maxAttempts;
    this.logger.warn(
      `Geração ${jobId} falhou (${kind}), tentativa ${attempts}, retry=${retry}`,
    );

    await this.generations.failGenerationJob({
      jobId,
      retry,
      errorCode: kind,
      errorMessage: `Falha do provedor: ${kind}`,
    });
    return retry
      ? { status: "retry", reason: kind }
      : { status: "failed", reason: kind };
  }
}
