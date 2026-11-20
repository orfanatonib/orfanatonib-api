import { Injectable } from "@nestjs/common";

import { RequestStageGenerationDto } from "../dto/request-stage-generation.dto";
import { ContentGenerationJobEntity } from "../entities/content-generation-job.entity";
import { ContentGenerationJobStatus } from "../enums/content-generation-job-status.enum";
import { AiJobQueuePort } from "../queue/ai-job-queue.port";
import { RuleException } from "src/common/exceptions";
import { containsSensitiveContentInstruction } from "../ai/utils/ai-provider-policy.util";
import { ContentGenerationRepository } from "../repositories/content-generation.repository";

@Injectable()
export class RequestStageGenerationService {
  constructor(
    private readonly packages: ContentGenerationRepository,
    private readonly queue: AiJobQueuePort,
  ) {}

  /**
   * Cria o job (PENDING, idempotente) numa transação e SÓ DEPOIS do commit
   * enfileira o id. Repetir a mesma chave devolve o job existente sem enfileirar de novo.
   */
  async execute(
    packageId: string,
    stageId: string,
    dto: RequestStageGenerationDto,
    requestedById: string,
  ): Promise<ContentGenerationJobEntity> {
    const revisionInstructions = dto.revisionInstructions?.trim() || null;
    // Instrução do administrador também passa pela política de conteúdo sensível (dados de pessoas).
    if (
      revisionInstructions &&
      containsSensitiveContentInstruction(revisionInstructions)
    ) {
      throw new RuleException(
        "As instruções não podem conter dados pessoais nem informações sensíveis de pessoas acolhidas",
        { field: "revisionInstructions" },
      );
    }

    const extra = dto.visualConfig?.instructions?.trim() || null;
    if (extra && containsSensitiveContentInstruction(extra)) {
      throw new RuleException(
        "A orientação extra não pode conter dados pessoais nem informações sensíveis de pessoas acolhidas",
        { field: "visualConfig.instructions" },
      );
    }
    const job = await this.packages.requestStageGeneration({
      packageId,
      stageId,
      capability: dto.capability,
      idempotencyKey: dto.idempotencyKey,
      requestedById,
      revisionInstructions,
      visualConfig: dto.visualConfig
        ? { ...dto.visualConfig, instructions: extra }
        : null,
    });

    if (job.status === ContentGenerationJobStatus.PENDING) {
      await this.queue.enqueue({ jobId: job.id });
    }
    return job;
  }
}
