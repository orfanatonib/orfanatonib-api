import { createHash } from "crypto";

import { BadRequestException, Injectable } from "@nestjs/common";

import { CONTENT_STUDIO_CATALOG_VERSION } from "../constants";
import { SaveStageContentDto } from "../dto/save-stage-content.dto";
import { ContentPackageEntity } from "../entities/content-package.entity";
import { ContentPackagesRepository } from "../repositories/content-packages.repository";
import { validateStructuredContent } from "../ai/utils/structured-content-policy.util";
import { containsSensitiveContentInstruction } from "../ai/utils/ai-provider-policy.util";
import { tiptapPlainText } from "../dto/tiptap-document.validator";

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
    const contentDocument = dto.contentDocument ?? null;
    if (
      contentDocument &&
      containsSensitiveContentInstruction(tiptapPlainText(contentDocument))
    ) {
      throw new BadRequestException(
        "O documento parece conter dados pessoais (documentos, telefones ou nomes de acolhidos). Remova e salve de novo.",
      );
    }
    const contentChecksum = createHash("sha256")
      .update(serializedContent)
      .update(contentDocument ? JSON.stringify(contentDocument) : "")
      .digest("hex");

    return this.packages.saveStageContent({
      packageId,
      stageId,
      structuredContent: dto.structuredContent,
      contentDocument,
      contentChecksum,
      templateVersion:
        dto.templateVersion?.trim() || CONTENT_STUDIO_CATALOG_VERSION,
      generationSnapshot: null,
      createdById,
    });
  }
}
