import { Injectable } from "@nestjs/common";

import { RequestStageChangesDto } from "../dto/request-stage-changes.dto";
import { ContentPackageEntity } from "../entities/content-package.entity";
import { ContentPackagesRepository } from "../repositories/content-packages.repository";

@Injectable()
export class RequestStageChangesService {
  constructor(private readonly packages: ContentPackagesRepository) {}

  async execute(
    packageId: string,
    stageId: string,
    dto: RequestStageChangesDto,
    authorId: string,
  ): Promise<ContentPackageEntity> {
    return this.packages.requestStageChanges({
      packageId,
      stageId,
      message: dto.message.trim(),
      blockKey: dto.blockKey?.trim() || null,
      authorId,
      versionId: dto.versionId,
      lockVersion: dto.lockVersion,
      contentChecksum: dto.contentChecksum,
    });
  }
}
