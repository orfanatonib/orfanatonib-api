import { Injectable } from "@nestjs/common";

import { ContentPackageEntity } from "../entities/content-package.entity";
import { StudioNotificationService } from "./studio-notification.service";
import { ContentStageContentRepository } from "../repositories/content-stage-content.repository";

@Injectable()
export class CompleteProductionStageService {
  constructor(
    private readonly packages: ContentStageContentRepository,
    private readonly notices: StudioNotificationService,
  ) {}

  async execute(
    packageId: string,
    stageId: string,
    actorId?: string,
  ): Promise<ContentPackageEntity> {
    const contentPackage = await this.packages.completeProductionStage({
      packageId,
      stageId,
      actorId,
    });
    await this.notices.productionCompleted(contentPackage, stageId, actorId);
    return contentPackage;
  }
}
