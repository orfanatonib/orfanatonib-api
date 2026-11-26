import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { IdeasPageRepository } from "../repositories/ideas-page.repository";
import { MediaItemProcessor } from "src/shared/media/media-item-processor";
import { MediaTargetType } from "src/shared/media/media-target-type.enum";
import { IdeasPageResponseDto } from "../dto/ideas-page-response.dto";
import { IdeasPageEntity } from "../entities/ideas-page.entity";
import { MediaItemEntity } from "src/shared/media/media-item/media-item.entity";
import { PaginatedResponseDto } from "src/shared/dto/paginated-response.dto";
import {
  isPaginated,
  toPaginated,
} from "src/shared/list-query/list-query.util";
import { pageOrderBy } from "../../page-list-query";
import { IdeasPageListQueryDto } from "../dto/ideas-page-list-query.dto";

@Injectable()
export class GetIdeasPageService {
  private readonly logger = new Logger(GetIdeasPageService.name);

  constructor(
    private readonly pageRepo: IdeasPageRepository,
    private readonly mediaProcessor: MediaItemProcessor,
  ) {}

  async findOne(id: string): Promise<IdeasPageEntity> {
    const page = await this.pageRepo.findOnePageById(id);
    if (!page) throw new NotFoundException("Page not found");
    return page;
  }

  async findAll(): Promise<IdeasPageEntity[]> {
    return this.pageRepo.findAllPagesWithSections();
  }

  /**
   * A página de ideias é sempre privada: a sessão é exigida pelo `JwtAuthGuard` do
   * controller e a coluna legada `public` é ignorada (tratada como `false`).
   */
  async findPageWithMedia(id: string): Promise<IdeasPageResponseDto> {
    const page = await this.findOne(id);

    const sectionIds = page.sections.map((s) => s.id);
    const media = await this.mediaProcessor.findManyMediaItemsByTargets(
      sectionIds,
      MediaTargetType.IdeasSection,
    );

    const map = this.groupByTarget(media);
    return IdeasPageResponseDto.fromEntity(page, map);
  }

  /** Lista legada (array) ou, com `page`, `{ data, meta }`; filtros, ordem e janela no banco. */
  async findList(
    query: IdeasPageListQueryDto = {},
  ): Promise<
    IdeasPageResponseDto[] | PaginatedResponseDto<IdeasPageResponseDto>
  > {
    const { items: pages, total } =
      await this.pageRepo.findListWithSections(query);
    const allSectionIds = pages.flatMap((p) => p.sections.map((s) => s.id));

    const allMedia =
      allSectionIds.length === 0
        ? []
        : await this.mediaProcessor.findManyMediaItemsByTargets(
            allSectionIds,
            MediaTargetType.IdeasSection,
          );
    const map = this.groupByTarget(allMedia);

    const data = pages.map((p) => IdeasPageResponseDto.fromEntity(p, map));
    return isPaginated(query)
      ? toPaginated(data, query, total, pageOrderBy(query))
      : data;
  }

  /** Lista legada: sempre o array, na ordem de `id ASC`. */
  async findAllPagesWithMedia(): Promise<IdeasPageResponseDto[]> {
    return (await this.findList({})) as IdeasPageResponseDto[];
  }

  private groupByTarget(
    media: MediaItemEntity[],
  ): Map<string, MediaItemEntity[]> {
    return media.reduce((acc, item) => {
      const arr = acc.get(item.targetId) || [];
      arr.push(item);
      acc.set(item.targetId, arr);
      return acc;
    }, new Map<string, MediaItemEntity[]>());
  }
}
