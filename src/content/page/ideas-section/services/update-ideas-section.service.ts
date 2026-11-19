import { Injectable } from "@nestjs/common";
import { ResourceNotFoundException } from "src/common/exceptions";

import { IDEAS_SECTION_MESSAGES } from "../constants";
import { IdeasSectionResponseDto } from "../dto/ideas-section-response.dto";
import { UpdateIdeasSectionDto } from "../dto/update-ideas-section.dto";
import { toIdeasSectionDto } from "../mappers/ideas-section.mapper";
import { IdeasSectionRepository } from "../repositories/ideas-section.repository";
import { UploadedFilesDict } from "../types";
import { IdeasSectionMediaService } from "./ideas-section-media.service";

@Injectable()
export class UpdateIdeasSectionService {
  constructor(
    private readonly repository: IdeasSectionRepository,
    private readonly mediaService: IdeasSectionMediaService,
  ) {}

  async execute(
    id: string,
    dto: UpdateIdeasSectionDto,
    files: UploadedFilesDict,
  ): Promise<IdeasSectionResponseDto> {
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw new ResourceNotFoundException(
        IDEAS_SECTION_MESSAGES.SECTION_NOT_FOUND,
      );
    }

    // Falha previsível antes de gravar: upload declarado sem arquivo/campo.
    this.mediaService.assertUploadsResolvable(dto.medias ?? [], files);

    const section = await this.repository.updateData(id, {
      title: dto.title,
      description: dto.description,
      public: dto.public ?? false,
    });

    try {
      const medias = await this.mediaService.replaceAll(
        id,
        dto.medias ?? [],
        files,
      );
      return toIdeasSectionDto(section, medias);
    } catch (error: unknown) {
      // Sem transação entre seção e mídia: devolve os dados antigos para a seção
      // não ficar com o texto novo e as mídias velhas.
      await this.repository
        .updateData(id, {
          title: existing.title,
          description: existing.description,
          public: existing.public,
        })
        .catch(() => undefined);
      throw error;
    }
  }
}
