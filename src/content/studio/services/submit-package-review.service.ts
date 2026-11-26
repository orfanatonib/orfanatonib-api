import { Injectable } from "@nestjs/common";

import { ContentAudience } from "../enums/content-audience.enum";
import { ContentStageStatus } from "../enums/content-stage-status.enum";
import { ContentPackageEntity } from "../entities/content-package.entity";
import { StudioExportService } from "../export/studio-export.service";
import { StudioNotificationService } from "./studio-notification.service";
import { ContentReviewRepository } from "../repositories/content-review.repository";

@Injectable()
export class SubmitPackageReviewService {
  constructor(
    private readonly packages: ContentReviewRepository,
    private readonly exports: StudioExportService,
    private readonly notices: StudioNotificationService,
  ) {}

  async execute(
    packageId: string,
    audiences?: readonly ContentAudience[],
    actorId?: string,
  ): Promise<ContentPackageEntity> {
    const contentPackage = await this.packages.submitPackageForReview(
      packageId,
      audiences,
      actorId,
    );
    // O revisor lê o PDF de cada item: ele já nasce pronto (em segundo plano), em vez de ser montado quando ele abre.
    const stageIds = (contentPackage.tracks ?? [])
      .filter(
        (track) => !audiences?.length || audiences.includes(track.audience),
      )
      .flatMap((track) => track.stages ?? [])
      .filter((stage) => stage.status === ContentStageStatus.IN_REVIEW)
      .map((stage) => stage.id);
    void this.exports.pregenerateStagePdfs(packageId, stageIds);
    await this.notices.submitted(contentPackage, audiences, actorId);
    return contentPackage;
  }
}
