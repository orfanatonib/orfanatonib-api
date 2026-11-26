import { Injectable } from "@nestjs/common";
import { ResourceNotFoundException } from "src/common/exceptions";
import { MediaItemProcessor } from "src/shared/media/media-item-processor";
import { MediaTargetType } from "src/shared/media/media-target-type.enum";
import { MediaItemEntity } from "src/shared/media/media-item/media-item.entity";
import { PaginatedResponseDto } from "src/shared/dto/paginated-response.dto";
import {
  isPaginated,
  toPaginated,
} from "src/shared/list-query/list-query.util";
import { VisitMaterialSortBy } from "../enums/visit-material-sort-by.enum";
import { VisitMaterialsPageRepository } from "../repositories/visit-material-page.repository";
import { QueryVisitMaterialsPageDto } from "../dto/query-visit-material-pages.dto";
import { VisitMaterialsPageResponseDTO } from "../dto/visit-material-page-response.dto";
import { VisitMaterialsPageEntity } from "../entities/visit-material-page.entity";
import { toVisitMaterialsPageResponseDto } from "../mappers/visit-material-page.mapper";
import { VISIT_MATERIAL_MESSAGES } from "../constants";
import { VisitMaterialSectionsService } from "./visit-material-sections.service";

@Injectable()
export class GetVisitMaterialPageService {
  constructor(
    private readonly repository: VisitMaterialsPageRepository,
    private readonly mediaItemProcessor: MediaItemProcessor,
    private readonly sections: VisitMaterialSectionsService,
  ) {}

  /** Sem `page` a lista é um array (consumidores internos); com `page`, o envelope paginado. */
  findAll(
    query?: QueryVisitMaterialsPageDto & { page?: undefined },
  ): Promise<VisitMaterialsPageResponseDTO[]>;
  findAll(
    query: QueryVisitMaterialsPageDto,
  ): Promise<
    | VisitMaterialsPageResponseDTO[]
    | PaginatedResponseDto<VisitMaterialsPageResponseDTO>
  >;
  async findAll(
    query: QueryVisitMaterialsPageDto = {},
  ): Promise<
    | VisitMaterialsPageResponseDTO[]
    | PaginatedResponseDto<VisitMaterialsPageResponseDTO>
  > {
    const { items: pages, total } = await this.repository.findFiltered(query);
    const respond = (data: VisitMaterialsPageResponseDTO[]) =>
      isPaginated(query)
        ? toPaginated(
            data,
            query,
            total,
            query.sortBy ?? VisitMaterialSortBy.CREATED_AT,
          )
        : data;
    if (pages.length === 0) return respond([]);

    const allMedia = await this.mediaItemProcessor.findManyMediaItemsByTargets(
      pages.map((page) => page.id),
      MediaTargetType.VisitMaterialsPage,
    );

    const mediaByPage = new Map<string, MediaItemEntity[]>();
    for (const item of allMedia) {
      const bucket = mediaByPage.get(item.targetId);
      if (bucket) bucket.push(item);
      else mediaByPage.set(item.targetId, [item]);
    }

    const sectionsByPage = await this.sections.loadForPages(
      pages.map((page) => page.id),
    );

    return respond(
      pages.map((page) =>
        toVisitMaterialsPageResponseDto(
          page,
          mediaByPage.get(page.id) ?? [],
          sectionsByPage.get(page.id) ?? [],
        ),
      ),
    );
  }

  async findOne(id: string): Promise<VisitMaterialsPageResponseDTO> {
    const page = await this.findEntityOrFail(id);
    return this.toResponse(page);
  }

  /** The page flagged as the current week, or `null` when none is set. */
  async findCurrentWeek(): Promise<VisitMaterialsPageResponseDTO | null> {
    const page = await this.repository.findCurrentWeek();
    if (!page) return null;
    return this.toResponse(page);
  }

  async findBySourceLessonId(
    sourceLessonId: string,
  ): Promise<VisitMaterialsPageResponseDTO | null> {
    const page = await this.repository.findBySourceLessonId(sourceLessonId);
    return page ? this.toResponse(page) : null;
  }

  /** Shared lookup for the write use cases. */
  async findEntityOrFail(id: string): Promise<VisitMaterialsPageEntity> {
    const page = await this.repository.findById(id);
    if (!page) {
      throw new ResourceNotFoundException(
        VISIT_MATERIAL_MESSAGES.PAGE_NOT_FOUND,
        { id },
      );
    }
    return page;
  }

  /** Resposta completa da página: mídias da página ("Geral") e seções por categoria. */
  async toResponse(
    page: VisitMaterialsPageEntity,
  ): Promise<VisitMaterialsPageResponseDTO> {
    return toVisitMaterialsPageResponseDto(
      page,
      await this.findMedia(page.id),
      await this.sections.loadForPage(page.id),
    );
  }

  private findMedia(pageId: string): Promise<MediaItemEntity[]> {
    return this.mediaItemProcessor.findMediaItemsByTarget(
      pageId,
      MediaTargetType.VisitMaterialsPage,
    );
  }
}
