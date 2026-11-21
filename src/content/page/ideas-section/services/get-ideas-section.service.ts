import { Injectable } from "@nestjs/common";
import { ResourceNotFoundException } from "src/common/exceptions";

import { IDEAS_SECTION_MESSAGES } from "../constants";
import { IdeasSectionPendingCountDto } from "../dto/ideas-section-pending-count.dto";
import { IdeasSectionResponseDto } from "../dto/ideas-section-response.dto";
import {
  groupMediasByTarget,
  toIdeasSectionDto,
} from "../mappers/ideas-section.mapper";
import { IdeasSectionRepository } from "../repositories/ideas-section.repository";
import { IdeasSectionMediaService } from "./ideas-section-media.service";

@Injectable()
export class GetIdeasSectionService {
  constructor(
    private readonly repository: IdeasSectionRepository,
    private readonly mediaService: IdeasSectionMediaService,
  ) {}

  async pendingCount(): Promise<IdeasSectionPendingCountDto> {
    return { pending: await this.repository.countUnattached() };
  }

  async findOne(id: string): Promise<IdeasSectionResponseDto> {
    const section = await this.repository.findById(id);
    if (!section) {
      throw new ResourceNotFoundException(
        IDEAS_SECTION_MESSAGES.SECTION_NOT_FOUND,
      );
    }

    const medias = await this.mediaService.findBySection(id);
    return toIdeasSectionDto(section, medias);
  }

  /**
   * O acervo de ideias ainda não publicadas.
   *
   * As mídias de todas as seções vêm numa consulta só — eram duas no total,
   * mas o agrupamento vivia no serviço; agora é do mapper.
   */
  async findUnattached(): Promise<IdeasSectionResponseDto[]> {
    const sections = await this.repository.findUnattached();
    if (sections.length === 0) return [];

    const medias = await this.mediaService.findBySections(
      sections.map((section) => section.id),
    );
    const bySection = groupMediasByTarget(medias);

    return sections.map((section) =>
      toIdeasSectionDto(section, bySection.get(section.id) ?? []),
    );
  }
}
