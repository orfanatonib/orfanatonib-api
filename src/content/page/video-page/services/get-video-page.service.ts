import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { VideosPageRepository } from "../repositories/video-page.repository";
import { MediaItemProcessor } from "src/shared/media/media-item-processor";
import { VideosPageResponseDto } from "../dto/video-page-response.dto";
import { MediaTargetType } from "src/shared/media/media-target-type.enum";
import { AuthContextService } from "src/core/auth/services/auth-context.service";
import type { Request } from "express";
import { PaginatedResponseDto } from "src/shared/dto/paginated-response.dto";
import {
  isPaginated,
  toPaginated,
} from "src/shared/list-query/list-query.util";
import { PageListQueryDto, pageOrderBy } from "../../page-list-query";

@Injectable()
export class GetVideosPageService {
  private readonly logger = new Logger(GetVideosPageService.name);

  constructor(
    private readonly videosPageRepo: VideosPageRepository,
    private readonly mediaItemProcessor: MediaItemProcessor,
    private readonly authContext: AuthContextService,
  ) {}

  /** Páginas não públicas só aparecem com sessão válida. */
  canSeeNonPublic(req: Request): Promise<boolean> {
    return this.authContext.isLoggedIn(req);
  }

  /** Lista legada (array, `id ASC`) ou, com `page`, `{ data, meta }`; filtros, ordem e janela no banco. */
  async findList(
    includeNonPublic: boolean,
    query: PageListQueryDto = {},
  ): Promise<
    VideosPageResponseDto[] | PaginatedResponseDto<VideosPageResponseDto>
  > {
    const { data, total } = await this.loadList(includeNonPublic, query);
    return isPaginated(query)
      ? toPaginated(data, query, total, pageOrderBy(query))
      : data;
  }

  async findAll(includeNonPublic = true): Promise<VideosPageResponseDto[]> {
    return (await this.loadList(includeNonPublic, {})).data;
  }

  private async loadList(
    includeNonPublic: boolean,
    query: PageListQueryDto,
  ): Promise<{ data: VideosPageResponseDto[]; total: number }> {
    const { items: pages, total } = await this.videosPageRepo.findList(
      query,
      includeNonPublic,
    );
    const pageIds = pages.map((page) => page.id);
    const mediaItems =
      pageIds.length === 0
        ? []
        : await this.mediaItemProcessor.findManyMediaItemsByTargets(
            pageIds,
            MediaTargetType.VideosPage,
          );

    const mediaMap = new Map<string, typeof mediaItems>();
    for (const item of mediaItems) {
      if (!mediaMap.has(item.targetId)) mediaMap.set(item.targetId, []);
      mediaMap.get(item.targetId)!.push(item);
    }

    return {
      data: pages.map((page) =>
        VideosPageResponseDto.fromEntity(page, mediaMap.get(page.id) || []),
      ),
      total,
    };
  }

  async findOne(
    id: string,
    includeNonPublic = true,
  ): Promise<VideosPageResponseDto> {
    const page = await this.videosPageRepo.findById(id);
    if (!page || (!includeNonPublic && !page.public))
      throw new NotFoundException("Videos page not found.");

    const mediaItems = await this.mediaItemProcessor.findMediaItemsByTarget(
      page.id,
      MediaTargetType.VideosPage,
    );
    return VideosPageResponseDto.fromEntity(page, mediaItems);
  }
}
