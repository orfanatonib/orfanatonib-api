import { Injectable } from "@nestjs/common";
import {
  ResourceConflictException,
  ResourceNotFoundException,
} from "src/common/exceptions";

import { IDEAS_SECTION_MESSAGES } from "../constants";
import { IdeasSectionResponseDto } from "../dto/ideas-section-response.dto";
import { UpdateIdeasSectionDto } from "../dto/update-ideas-section.dto";
import { toIdeasSectionDto } from "../mappers/ideas-section.mapper";
import { IdeasSectionRepository } from "../repositories/ideas-section.repository";
import { UploadedFilesDict } from "../types";
import { IdeasSectionMediaService } from "./ideas-section-media.service";

/**
 * Edita a seção e a publica numa página de ideias no mesmo passo — é o que a
 * tela administrativa faz ao aprovar uma ideia enviada.
 */
@Injectable()
export class AttachIdeasSectionService {
  constructor(
    private readonly repository: IdeasSectionRepository,
    private readonly mediaService: IdeasSectionMediaService,
  ) {}

  async execute(
    sectionId: string,
    pageId: string,
    dto: UpdateIdeasSectionDto,
    files: UploadedFilesDict,
  ): Promise<IdeasSectionResponseDto> {
    const section = await this.repository.findById(sectionId);
    if (!section) {
      throw new ResourceNotFoundException(
        IDEAS_SECTION_MESSAGES.SECTION_NOT_FOUND,
      );
    }
    if (section.page) {
      throw new ResourceConflictException(
        IDEAS_SECTION_MESSAGES.ALREADY_ATTACHED,
      );
    }

    const page = await this.repository.findPageById(pageId);
    if (!page) {
      throw new ResourceNotFoundException(
        IDEAS_SECTION_MESSAGES.PAGE_NOT_FOUND,
      );
    }

    const attached = await this.repository.attachToPage(
      sectionId,
      {
        title: dto.title,
        description: dto.description,
        public: dto.public ?? false,
      },
      page,
    );

    const medias = await this.mediaService.replaceAll(
      sectionId,
      dto.medias ?? [],
      files,
    );

    return toIdeasSectionDto(attached, medias);
  }
}
