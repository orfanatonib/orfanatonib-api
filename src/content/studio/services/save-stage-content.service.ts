import { createHash } from "crypto";

import { Injectable } from "@nestjs/common";

import { CONTENT_STUDIO_CATALOG_VERSION } from "../constants";
import { SaveStageContentDto } from "../dto/save-stage-content.dto";
import { ContentPackageEntity } from "../entities/content-package.entity";
import { ContentPackagesRepository } from "../repositories/content-packages.repository";
import { validateStructuredContent } from "../ai/utils/structured-content-policy.util";

@Injectable()
export class SaveStageContentService {
  constructor(private readonly packages: ContentPackagesRepository) {}

  async execute(
    packageId: string,
    stageId: string,
    dto: SaveStageContentDto,
    createdById: string,
  ): Promise<ContentPackageEntity> {
    const serializedContent = validateStructuredContent(dto.structuredContent);
    const contentChecksum = createHash("sha256")
      .update(serializedContent)
      .digest("hex");

    return this.packages.saveStageContent({
      packageId,
      stageId,
      structuredContent: dto.structuredContent,
      contentChecksum,
      templateVersion: dto.templateVersion?.trim() || CONTENT_STUDIO_CATALOG_VERSION,
      generationSnapshot: null,
      createdById,
    });
  }
}
