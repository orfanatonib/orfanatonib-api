import { Injectable } from "@nestjs/common";

import { ContentGenerationJobEntity } from "../entities/content-generation-job.entity";
import { ContentGenerationRepository } from "../repositories/content-generation.repository";

@Injectable()
export class GetLatestStageGenerationService {
  constructor(private readonly packages: ContentGenerationRepository) {}

  /** `null` quando a etapa nunca teve geração (a etapa em si inexistente já dá 404 no repositório). */
  async execute(
    packageId: string,
    stageId: string,
  ): Promise<ContentGenerationJobEntity | null> {
    return this.packages.findLatestGenerationJob(packageId, stageId);
  }
}
