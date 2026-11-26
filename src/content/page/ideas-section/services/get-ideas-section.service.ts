import { Injectable } from "@nestjs/common";
import { ResourceNotFoundException } from "src/common/exceptions";

import { IDEAS_SECTION_MESSAGES } from "../constants";
import { IdeasSectionPendingCountDto } from "../dto/ideas-section-pending-count.dto";
import { IdeasSectionResponseDto } from "../dto/ideas-section-response.dto";
import {
  groupMediasByTarget,
  toIdeasSectionDto,
} from "../mappers/ideas-section.mapper";
import { IdeasSectionListQueryDto } from "../dto/ideas-section-list-query.dto";
import { IdeasSectionSortBy } from "../enums/ideas-section-sort-by.enum";
import { PaginatedResponseDto } from "src/shared/dto/paginated-response.dto";
import {
  isPaginated,
  toPaginated,
} from "src/shared/list-query/list-query.util";
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
  async findUnattached(
    query: IdeasSectionListQueryDto = {},
  ): Promise<
    IdeasSectionResponseDto[] | PaginatedResponseDto<IdeasSectionResponseDto>
  > {
    const { items: sections, total } =
      await this.repository.findUnattachedFiltered(query);
    const bySection = groupMediasByTarget(
      sections.length === 0
        ? []
        : await this.mediaService.findBySections(
            sections.map((section) => section.id),
          ),
    );

    const data = sections.map((section) =>
      toIdeasSectionDto(section, bySection.get(section.id) ?? []),
    );
    if (isPaginated(query)) {
      return toPaginated(
        data,
        query,
        total,
        query.sortBy ?? IdeasSectionSortBy.CREATED_AT,
      );
    }
    return data;
  }
}
