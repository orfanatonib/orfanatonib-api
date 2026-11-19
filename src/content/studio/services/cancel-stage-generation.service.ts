import { Injectable } from "@nestjs/common";

import { ResourceNotFoundException } from "src/common/exceptions";

import { ContentGenerationJobEntity } from "../entities/content-generation-job.entity";
import { ContentGenerationRepository } from "../repositories/content-generation.repository";

@Injectable()
export class CancelStageGenerationService {
  constructor(private readonly packages: ContentGenerationRepository) {}

  /** O worker vê o job CANCELLED e descarta o resultado (não grava versão). */
  async execute(
    packageId: string,
    stageId: string,
  ): Promise<ContentGenerationJobEntity> {
    const job = await this.packages.cancelGenerationJob(packageId, stageId);
    if (!job) {
      throw new ResourceNotFoundException("Não há geração ativa nesta etapa");
    }
    return job;
  }
}
