import { Injectable } from "@nestjs/common";

import { ContentPackageEntity } from "../entities/content-package.entity";
import { ContentStageStatus } from "../enums/content-stage-status.enum";
import { StudioExportService } from "../export/studio-export.service";
import { StudioNotificationService } from "./studio-notification.service";
import { ContentReviewRepository } from "../repositories/content-review.repository";

@Injectable()
export class ResolveReviewCommentService {
  constructor(
    private readonly packages: ContentReviewRepository,
    private readonly exports: StudioExportService,
    private readonly notices: StudioNotificationService,
  ) {}

  async execute(
    packageId: string,
    commentId: string,
    message: string,
    reviewerId: string,
  ): Promise<ContentPackageEntity> {
    const contentPackage = await this.packages.resolveReviewComment(
      packageId,
      commentId,
      message,
      reviewerId,
    );
    // Se o item voltou para a revisão, o PDF dele já fica pronto para o revisor (em segundo plano).
    const stage = (contentPackage.tracks ?? [])
      .flatMap((track) => track.stages ?? [])
      .find((item) =>
        item.reviewComments?.some((comment) => comment.id === commentId),
      );
    if (stage?.status === ContentStageStatus.IN_REVIEW) {
      void this.exports.pregenerateStagePdfs(packageId, [stage.id]);
      await this.notices.resolvedAndReturned(
        contentPackage,
        stage.id,
        reviewerId,
      );
    }
    return contentPackage;
  }
}
