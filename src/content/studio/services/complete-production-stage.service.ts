import { Injectable } from "@nestjs/common";

import { ContentPackageEntity } from "../entities/content-package.entity";
import { ContentPackagesRepository } from "../repositories/content-packages.repository";

@Injectable()
export class CompleteProductionStageService {
  constructor(private readonly packages: ContentPackagesRepository) {}

  async execute(packageId: string, stageId: string): Promise<ContentPackageEntity> {
    return this.packages.completeProductionStage({ packageId, stageId });
  }
}
