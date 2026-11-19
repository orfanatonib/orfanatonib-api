import { Injectable } from "@nestjs/common";

import { ContentPackageEntity } from "../entities/content-package.entity";
import { ContentReviewRepository } from "../repositories/content-review.repository";
import { ApproveReviewStageDto } from "../dto/approve-review-stage.dto";

@Injectable()
export class ApproveReviewStageService {
  constructor(private readonly packages: ContentReviewRepository) {}

  async execute(
    packageId: string,
    stageId: string,
    dto: ApproveReviewStageDto,
    reviewerId: string,
  ): Promise<ContentPackageEntity> {
    return this.packages.approveReviewStage({
      packageId,
      stageId,
      versionId: dto.versionId,
      lockVersion: dto.lockVersion,
      contentChecksum: dto.contentChecksum,
      reviewerId,
    });
  }
}
