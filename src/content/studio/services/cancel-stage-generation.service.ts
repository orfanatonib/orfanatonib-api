import { Injectable } from "@nestjs/common";

import { ResourceNotFoundException } from "src/common/exceptions";

import { ContentGenerationJobEntity } from "../entities/content-generation-job.entity";
import { ContentPackagesRepository } from "../repositories/content-packages.repository";

@Injectable()
export class CancelStageGenerationService {
  constructor(private readonly packages: ContentPackagesRepository) {}

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
