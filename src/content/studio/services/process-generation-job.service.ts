import { createHash, randomUUID } from "crypto";

import { Injectable, Logger, Optional } from "@nestjs/common";

import { AuditOutcome } from "src/core/audit/enums";
import { ActionBoundaryService } from "src/core/audit/services/action-boundary.service";
import { runAuditedJob } from "src/core/audit/utils/audited-job.utils";

import { AiGenerationGateway } from "../ai/ai-generation.gateway";
import { AiGenerationCapability } from "../ai/enums/ai-generation-capability.enum";
import { AiProviderErrorKind } from "../ai/enums/ai-provider-error-kind.enum";
import { AiProviderRequestError } from "../ai/openai-generation.gateway";
import {
  GENERATION_LEASE_MS,
  GENERATION_WORKER_PREFIX,
  STAGE_MAX_OUTPUT_TOKENS,
} from "../ai/stage-generation.constants";
import {
  buildStageRequest,
  StageGenerationContext,
} from "../ai/generation/stage-prompt.builder";
import {
  StageOutputError,
  UpstreamVerse,
  validateStageOutput,
} from "../ai/generation/stage-output.validator";
import { ProcessStageImagesService } from "./process-stage-images.service";
import { RequestStageImagesService } from "./request-stage-images.service";
import { ContentStageType } from "../enums/content-stage-type.enum";
import { validateStructuredContent } from "../ai/utils/structured-content-policy.util";
import { CONTENT_STUDIO_CATALOG_VERSION } from "../constants";
import type { StartedGenerationJob, TextJobStep } from "../types";
import { AiJobOutcome, AiQueueJob } from "../queue/ai-job-queue.port";
import {
  DEFAULT_RETRY_POLICY,
  RetryPolicy,
} from "../queue/provider-retry.utils";
import { StudioNotificationService } from "./studio-notification.service";
import { ContentGenerationRepository } from "../repositories/content-generation.repository";
import { ContentStageContentRepository } from "../repositories/content-stage-content.repository";

const RETRYABLE_KINDS: ReadonlySet<AiProviderErrorKind> = new Set([
  AiProviderErrorKind.RATE_LIMIT,
  AiProviderErrorKind.TIMEOUT,
  AiProviderErrorKind.SERVER,
  AiProviderErrorKind.NETWORK,
  AiProviderErrorKind.OUTPUT_TRUNCATED,
  AiProviderErrorKind.UNKNOWN,
]);

/** Nome da ação nos registros de auditoria e de observabilidade deste worker. */
export const GENERATION_AUDIT_JOB_NAME = "content-studio-generation";
export const GENERATION_AUDIT_RESOURCE_TYPE = "content_generation_job";

/** Resultado de uma passada do worker: o desfecho para a fila e o que a auditoria precisa saber. */
interface GenerationRun {
  readonly outcome: AiJobOutcome;
  /** `false` quando o job já estava concluído/cancelado e foi só descartado (não é uma ação). */
  readonly ran: boolean;
  readonly errorCode: string | null;
}

/** Quem pediu e de qual pacote é o job que esta passada processou (preenchido assim que o job é carregado). */
interface GenerationJobRef {
  packageId?: string;
  requestedById?: string;
}

/** Versículo da lição aprovada: fonte fechada dos visuais e da fixação do versículo. */
function approvedLessonVerse(
  context: StageGenerationContext,
): UpstreamVerse | null {
  const verse = context.upstream[ContentStageType.LESSON]?.memoryVerse as
    | { text?: unknown; reference?: unknown }
    | undefined;
  return typeof verse?.text === "string" &&
    typeof verse.reference === "string" &&
    verse.text.trim()
    ? { text: verse.text, reference: verse.reference }
    : null;
}

@Injectable()
export class ProcessGenerationJobService {
  private readonly logger = new Logger(ProcessGenerationJobService.name);
  private readonly workerId = `${GENERATION_WORKER_PREFIX}-${randomUUID().slice(0, 8)}`;

  constructor(
    private readonly generations: ContentGenerationRepository,
    private readonly stageContents: ContentStageContentRepository,
    private readonly gateway: AiGenerationGateway,
    private readonly images: ProcessStageImagesService,
    private readonly requestImages: RequestStageImagesService,
    private readonly notices: StudioNotificationService,
    @Optional() private readonly boundary?: ActionBoundaryService,
  ) {}

  private readonly policy: RetryPolicy = DEFAULT_RETRY_POLICY;

  /**
   * Carrega o job do MySQL (a fila só traz o id), chama o provedor, valida a
   * saída e grava versão + job concluído numa única transação. Job já concluído
   * ou cancelado é descartado sem custo (ack).
   */
  async handle(queued: AiQueueJob): Promise<AiJobOutcome> {
    // Cada passada é uma ação auditada (job `content-studio-generation`, recurso = o job); só ids, nunca conteúdo.
    const ref: GenerationJobRef = {};
    const run = await runAuditedJob<GenerationRun>(
      this.boundary,
      GENERATION_AUDIT_JOB_NAME,
      () => this.execute(queued, ref),
      (result) =>
        !result.ran
          ? null
          : result.outcome.status === "done"
            ? AuditOutcome.Succeeded
            : AuditOutcome.Failed,
      {
        resourceType: GENERATION_AUDIT_RESOURCE_TYPE,
        resourceId: queued.jobId,
      },
      (result) => result.errorCode,
    );
    await this.announce(queued.jobId, ref, run);
    return run.outcome;
  }

  /** Avisa os administradores do desfecho definitivo (concluído ou falha sem nova tentativa); nunca atrapalha a fila. */
  private async announce(
    jobId: string,
    ref: GenerationJobRef,
    run: GenerationRun,
  ): Promise<void> {
    if (!run.ran || !ref.packageId || run.outcome.status === "retry") return;
    try {
      await this.notices.generationFinished(
        ref.packageId,
        jobId,
        run.outcome.status === "failed",
        ref.requestedById,
      );
    } catch (error: unknown) {
      this.logger.warn(
        `Aviso da geração ${jobId} não foi criado: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  private async execute(
    queued: AiQueueJob,
    ref: GenerationJobRef,
  ): Promise<GenerationRun> {
    const job = await this.generations.startGenerationJob(
      queued.jobId,
      this.workerId,
      GENERATION_LEASE_MS,
    );
    if (!job)
      return { outcome: { status: "done" }, ran: false, errorCode: null };
    ref.packageId = job.packageId;
    ref.requestedById = job.requestedById;

    let where = `job=${job.jobId} pacote=${job.packageId} etapa=${job.stageId}`;
    const startedAt = new Date().toISOString();
    const step = (name: TextJobStep) =>
      this.reportStep(job.jobId, name, startedAt);
    if (job.capability === AiGenerationCapability.IMAGE_GENERATION) {
      try {
        await this.images.process(job);
        return { outcome: { status: "done" }, ran: true, errorCode: null };
      } catch (error: unknown) {
        return this.onFailure(job.jobId, job.attempts, error, where, true);
      }
    }
    try {
      if (job.capability !== AiGenerationCapability.TEXT_STRUCTURED) {
        throw new AiProviderRequestError(
          AiProviderErrorKind.SCHEMA,
          "unsupported_capability",
        );
      }

      await step("PREPARING");
      const context = await this.generations.loadStageGenerationContext(
        job.stageId,
        job.jobId,
      );
      if (!context)
        throw new AiProviderRequestError(
          AiProviderErrorKind.SCHEMA,
          "context_not_found",
        );
      where = `${where} tipo=${context.stageType} publico=${context.audience}`;

      // Prompt e esquema por etapa E por público (bebê, criança, adolescente, adulto).
      // Nova tentativa depois de recusa da validação: o modelo recebe o motivo e corrige.
      const retryFeedback = /\((.+)\)\s*$/.exec(job.previousError ?? "")?.[1];
      const built = buildStageRequest(
        retryFeedback ? { ...context, retryFeedback } : context,
      );
      this.logger.log(
        `Geração iniciada ${where} tentativa=${job.attempts} prompt=${built.promptVersion}`,
      );
      await step("WRITING");
      const result = await this.gateway.generateStructuredText({
        correlationId: job.jobId,
        instructions: built.instructions,
        input: built.input,
        outputSchema: built.outputSchema,
        maxOutputTokens: STAGE_MAX_OUTPUT_TOKENS,
      });

      await step("VALIDATING");
      const { content: generated, internal } = validateStageOutput(
        context.stageType,
        context.audience,
        result.output,
        approvedLessonVerse(context),
        context.theme,
        context.visualConfig,
      );
      // As escolhas dos visuais ficam na versão: é a partir delas que as imagens são (re)geradas.
      const content = context.visualConfig
        ? { ...generated, visualConfig: context.visualConfig }
        : generated;
      const serialized = validateStructuredContent(content);
      await step("SAVING");
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
          // Orientação pessoal do administrador somada às regras oficiais nesta geração.
          adminPromptApplied: Boolean(context.adminPrompt?.trim()),
          // Notas internas do modelo (conferência humana): ficam aqui, fora do conteúdo editável.
          reviewerNotes: internal.reviewerNotes ?? "",
          centralMessage: internal.centralMessage ?? "",
        },
        createdById: job.requestedById,
        completedJobId: job.jobId,
      });
      this.logger.log(
        `Geração concluída ${where} provedor=${result.provider} modelo=${result.model} ` +
          `tokens=${result.usage?.inputTokens ?? "?"}/${result.usage?.outputTokens ?? "?"}/${result.usage?.totalTokens ?? "?"} ` +
          `duracaoMs=${result.durationMs}`,
      );
      await this.enqueueImages(job, context, where);
      return { outcome: { status: "done" }, ran: true, errorCode: null };
    } catch (error: unknown) {
      return this.onFailure(job.jobId, job.attempts, error, where);
    }
  }

  /** Anota a fase atual no job (a tela mostra por SSE) e renova o lease; falhar aqui nunca derruba a geração. */
  private async reportStep(
    jobId: string,
    step: TextJobStep,
    startedAt: string,
  ): Promise<void> {
    try {
      await this.generations.updateJobProgress(
        jobId,
        { phase: "TEXT", step, startedAt },
        GENERATION_LEASE_MS,
      );
    } catch {
      /* só informativo */
    }
  }

  /** Depois do plano dos visuais, cria o job que desenha as imagens (falhar aqui não perde o texto já salvo). */
  private async enqueueImages(
    job: StartedGenerationJob,
    context: StageGenerationContext,
    where: string,
  ): Promise<void> {
    // Visuais da lição (com as escolhas do admin) e cartões do versículo geram imagens depois do plano.
    const lessonVisuals =
      context.stageType === ContentStageType.LESSON_VISUALS &&
      Boolean(context.visualConfig);
    const imageStage =
      context.stageType === ContentStageType.VERSE_VISUALS ||
      context.stageType === ContentStageType.VERSE_FIXATION ||
      context.stageType === ContentStageType.STANDARD_GAME;
    if (!lessonVisuals && !imageStage) return;
    try {
      const versionId = await this.generations.currentVersionIdOf(job.stageId);
      if (!versionId) return;
      await this.requestImages.execute({
        packageId: job.packageId,
        stageId: job.stageId,
        versionId,
        requestedById: job.requestedById,
        idempotencyKey: `img-${job.jobId}`,
        skipCapacityCheck: true,
      });
    } catch (error: unknown) {
      this.logger.error(
        `Não foi possível enfileirar as imagens ${where}: ${error instanceof Error ? error.name : "erro"}`,
      );
    }
  }

  private async onFailure(
    jobId: string,
    attempts: number,
    error: unknown,
    where: string,
    keepStage = false,
  ): Promise<GenerationRun> {
    const kind =
      error instanceof AiProviderRequestError
        ? error.kind
        : AiProviderErrorKind.UNKNOWN;
    // Causa curta e segura (sem prompt nem conteúdo): código do provedor ou as regras do público que falharam.
    const cause =
      error instanceof AiProviderRequestError
        ? (error.detail ?? null)
        : error instanceof StageOutputError
          ? error.issues.slice(0, 3).join("; ")
          : error instanceof Error
            ? error.name
            : null;
    // Saída fora do esquema/regras do público pode ser variação do modelo: vale tentar de novo.
    const retry =
      (RETRYABLE_KINDS.has(kind) || error instanceof StageOutputError) &&
      attempts < this.policy.maxAttempts;
    const message = `Geração falhou ${where} tipo_erro=${kind}${cause ? ` causa=${cause}` : ""} tentativa=${attempts} retry=${retry}`;
    // `error` vai para a observabilidade (só erro é persistido); retry é aviso só no console.
    if (retry) this.logger.warn(message);
    else this.logger.error(message);

    await this.generations.failGenerationJob({
      jobId,
      retry,
      keepStage,
      errorCode: kind,
      errorMessage: `Falha do provedor: ${kind}${cause ? ` (${cause})` : ""}`,
    });
    return {
      outcome: retry
        ? { status: "retry", reason: kind }
        : { status: "failed", reason: kind },
      ran: true,
      errorCode: kind,
    };
  }
}
