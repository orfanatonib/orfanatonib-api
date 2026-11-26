import { Injectable } from "@nestjs/common";
import { randomUUID } from "crypto";

import { RuleException } from "src/common/exceptions";
import { containsSensitiveContentInstruction } from "../ai/utils/ai-provider-policy.util";
import { ContentGenerationJobEntity } from "../entities/content-generation-job.entity";
import { ContentGenerationJobStatus } from "../enums/content-generation-job-status.enum";
import { AiJobQueuePort } from "../queue/ai-job-queue.port";
import { ContentGenerationRepository } from "../repositories/content-generation.repository";

/**
 * Cria e enfileira o job de IMAGENS de uma versão: logo depois que o texto dos visuais é gerado, ou quando o admin
 * pede para refazer uma ou mais imagens. O texto não muda; só as imagens.
 */
@Injectable()
export class RequestStageImagesService {
  constructor(
    private readonly generations: ContentGenerationRepository,
    private readonly queue: AiJobQueuePort,
  ) {}

  async execute(input: {
    packageId: string;
    stageId: string;
    versionId: string;
    slots?: readonly string[] | null;
    instructions?: string | null;
    requestedById: string;
    /** Chave estável (a geração de texto que originou o pedido); sem ela, cada pedido é novo. */
    idempotencyKey?: string;
    /** Encadeamento automático depois do texto: não passa pela trava de capacidade (a vaga já é dele). */
    skipCapacityCheck?: boolean;
  }): Promise<ContentGenerationJobEntity> {
    const instructions = input.instructions?.trim() || null;
    if (instructions && containsSensitiveContentInstruction(instructions))
      throw new RuleException(
        "A orientação não pode conter dados pessoais nem informações sensíveis de pessoas acolhidas",
        { field: "instructions" },
      );
    const job = await this.generations.requestStageImages({
      packageId: input.packageId,
      stageId: input.stageId,
      versionId: input.versionId,
      slots: input.slots?.length ? input.slots : null,
      instructions,
      idempotencyKey: input.idempotencyKey ?? `img-${randomUUID()}`,
      requestedById: input.requestedById,
      skipCapacityCheck: input.skipCapacityCheck,
    });
    if (job.status === ContentGenerationJobStatus.PENDING)
      await this.queue.enqueue({ jobId: job.id });
    return job;
  }
}
