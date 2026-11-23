import { Injectable } from "@nestjs/common";

import { ContentPackageEntity } from "../entities/content-package.entity";
import { ContentStageContentRepository } from "../repositories/content-stage-content.repository";

@Injectable()
export class CompleteProductionStageService {
  constructor(private readonly packages: ContentStageContentRepository) {}

  async execute(
    packageId: string,
    stageId: string,
    actorId?: string,
  ): Promise<ContentPackageEntity> {
    return this.packages.completeProductionStage({
      packageId,
      stageId,
      actorId,
    });
  }
}
