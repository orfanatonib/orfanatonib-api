import { Injectable } from "@nestjs/common";

import { ContentPackageEntity } from "../entities/content-package.entity";
import { StudioNotificationService } from "./studio-notification.service";
import { ContentReviewRepository } from "../repositories/content-review.repository";
import { ApproveReviewStageDto } from "../dto/approve-review-stage.dto";

@Injectable()
export class ApproveReviewStageService {
  constructor(
    private readonly packages: ContentReviewRepository,
    private readonly notices: StudioNotificationService,
  ) {}

  async execute(
    packageId: string,
    stageId: string,
    dto: ApproveReviewStageDto,
    reviewerId: string,
  ): Promise<ContentPackageEntity> {
    const contentPackage = await this.packages.approveReviewStage({
      packageId,
      stageId,
      versionId: dto.versionId,
      lockVersion: dto.lockVersion,
      contentChecksum: dto.contentChecksum,
      reviewerId,
    });
    await this.notices.approved(contentPackage, stageId, reviewerId);
    return contentPackage;
  }
}
