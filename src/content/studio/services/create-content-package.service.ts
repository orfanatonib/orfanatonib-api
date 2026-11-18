import { Injectable } from "@nestjs/common";

import { RuleException } from "src/common/exceptions";

import {
  CONTENT_AUDIENCE_CATALOG,
  CONTENT_STUDIO_CATALOG_VERSION,
} from "../constants";
import { CreateContentPackageDto } from "../dto/create-content-package.dto";
import { ContentPackageEntity } from "../entities/content-package.entity";
import { ContentPackagesRepository } from "../repositories/content-packages.repository";
import { containsSensitiveContentInstruction } from "../ai/utils/ai-provider-policy.util";

@Injectable()
export class CreateContentPackageService {
  constructor(private readonly packages: ContentPackagesRepository) {}

  async execute(
    dto: CreateContentPackageDto,
    createdById: string,
  ): Promise<ContentPackageEntity> {
    const theme = dto.theme.trim();
    const biblicalReferences = dto.biblicalReferences.trim();
    const canonicalObjective = dto.canonicalObjective.trim();
    const canonicalNotes = dto.canonicalNotes?.trim() || null;

    if (!theme || !biblicalReferences || !canonicalObjective) {
      throw new RuleException(
        "Tema, referências bíblicas e objetivo são obrigatórios",
      );
    }
    if (
      containsSensitiveContentInstruction(
        [
          theme,
          biblicalReferences,
          canonicalObjective,
          canonicalNotes ?? "",
        ].join("\n"),
      )
    ) {
      throw new RuleException(
        "O pacote não pode incluir dados pessoais de pessoas acolhidas",
      );
    }

    return this.packages.createWithCatalog({
      theme,
      biblicalReferences,
      canonicalObjective,
      canonicalNotes,
      templateCatalogVersion: CONTENT_STUDIO_CATALOG_VERSION,
      createdById,
      audiences: CONTENT_AUDIENCE_CATALOG,
    });
  }
}
