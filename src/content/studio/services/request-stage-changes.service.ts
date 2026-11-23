import { Injectable } from "@nestjs/common";

import { RequestStageChangesDto } from "../dto/request-stage-changes.dto";
import { ContentPackageEntity } from "../entities/content-package.entity";
import { StudioNotificationService } from "./studio-notification.service";
import { ContentReviewRepository } from "../repositories/content-review.repository";

@Injectable()
export class RequestStageChangesService {
  constructor(
    private readonly packages: ContentReviewRepository,
    private readonly notices: StudioNotificationService,
  ) {}

  async execute(
    packageId: string,
    stageId: string,
    dto: RequestStageChangesDto,
    authorId: string,
  ): Promise<ContentPackageEntity> {
    const contentPackage = await this.packages.requestStageChanges({
      packageId,
      stageId,
      message: dto.message.trim(),
      blockKey: dto.blockKey?.trim() || null,
      authorId,
      versionId: dto.versionId,
      lockVersion: dto.lockVersion,
      contentChecksum: dto.contentChecksum,
    });
    await this.notices.changesRequested(contentPackage, stageId, authorId);
    return contentPackage;
  }
}
