import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { MediaItemProcessor } from "src/shared/media/media-item-processor";
import { MediaItemEntity } from "src/shared/media/media-item/media-item.entity";
import { ImagePageRepository } from "../repositories/image-page.repository";
import { ImagePageResponseDto } from "../dto/image-page-response.dto";
import { PaginatedImageSectionResponseDto } from "../dto/paginated-image-section.dto";
import { ImageSectionRepository } from "src/content/page/image-section/repositories/image-section.repository";
import { Request } from "express";
import type { FindOptionsWhere } from "typeorm";
import { ImageSectionEntity } from "../entities/image-section.entity";
import { AuthContextService } from "src/core/auth/services/auth-context.service";
import { GetCelebrationService } from "src/content/page/feed-celebration/services/get-celebration.service";
import { GetFeedCommentService } from "src/content/page/feed-photo-comment/services/get-feed-comment.service";
import { FeedSectionExtras } from "../types";

@Injectable()
export class GetImagePageService {
  private readonly logger = new Logger(GetImagePageService.name);

  constructor(
    private readonly imagePageRepository: ImagePageRepository,
    private readonly sectionRepository: ImageSectionRepository,
    private readonly mediaItemProcessor: MediaItemProcessor,
    private readonly authContext: AuthContextService,
    private readonly celebrations: GetCelebrationService,
    private readonly comments: GetFeedCommentService,
  ) {}

  /** Galerias não públicas só aparecem com sessão válida. */
  canSeeNonPublic(req: Request): Promise<boolean> {
    return this.authContext.isLoggedIn(req);
  }

  async findAll(includeNonPublic = true): Promise<ImagePageResponseDto[]> {
    const allPages = await this.imagePageRepository.findAllWithSections();
    const pages = includeNonPublic
      ? allPages
      : allPages.filter((page) => page.public);

    const sectionIds = pages.flatMap((page) => page.sections.map((s) => s.id));
    const mediaItems =
      await this.mediaItemProcessor.findManyMediaItemsByTargets(
        sectionIds,
        "ImagesPage",
      );

    const mediaMap = new Map<string, MediaItemEntity[]>();
    for (const item of mediaItems) {
      if (!mediaMap.has(item.targetId)) mediaMap.set(item.targetId, []);
      mediaMap.get(item.targetId)!.push(item);
    }

    const result = pages.map((page) =>
      ImagePageResponseDto.fromEntity(page, mediaMap),
    );
    return result;
  }

  async findOne(
    id: string,
    includeNonPublic = true,
  ): Promise<ImagePageResponseDto> {
    const page = await this.imagePageRepository.findByIdWithSections(id);
    if (!page || (!includeNonPublic && !page.public)) {
      this.logger.warn(`Page with ID ${id} not found`);
      throw new NotFoundException("Gallery page not found.");
    }

    if (!page.route) {
      this.logger.warn(`Route not found for page ID: ${id}`);
      throw new NotFoundException(
        `A galeria com id ${id} não possui rota associada.`,
      );
    }

    const sectionIds = page.sections.map((s) => s.id);
    const media = await this.mediaItemProcessor.findManyMediaItemsByTargets(
      sectionIds,
      "ImagesPage",
    );

    const mediaMap = new Map<string, MediaItemEntity[]>();
    for (const item of media) {
      if (!mediaMap.has(item.targetId)) mediaMap.set(item.targetId, []);
      mediaMap.get(item.targetId)!.push(item);
    }

    const result = ImagePageResponseDto.fromEntity(page, mediaMap);
    return result;
  }

  async findSectionsPaginated(
    pageId: string,
    page: number,
    limit: number,
    req: Request,
  ): Promise<PaginatedImageSectionResponseDto> {
    const offset = (page - 1) * limit;

    const viewerId = await this.authContext.getUserId(req);
    const loggedIn = viewerId !== null;

    const imagePage = await this.imagePageRepository.findById(pageId);
    if (!imagePage || (!loggedIn && !imagePage.public)) {
      this.logger.warn(`Page with ID ${pageId} not found`);
      throw new NotFoundException(
        `Página de galeria com ID ${pageId} não encontrada.`,
      );
    }

    const where: FindOptionsWhere<ImageSectionEntity> = {
      page: { id: pageId },
      ...(loggedIn ? {} : { public: true }),
    };

    const [sections, total] = await this.sectionRepository.findAndCount({
      where,
      // O nome do autor só é carregado (e exibido) para quem tem sessão.
      relations: loggedIn ? ["author"] : [],
      order: { createdAt: "DESC" },
      skip: offset,
      take: limit,
    });

    const sectionIds = sections.map((section) => section.id);
    const mediaItems =
      await this.mediaItemProcessor.findManyMediaItemsByTargets(
        sectionIds,
        "ImagesPage",
      );
    const mediaMap = this.groupMediaBySectionId(mediaItems);
    const extrasById = await this.buildFeedExtras(sectionIds, viewerId);

    return PaginatedImageSectionResponseDto.fromEntities(
      imagePage,
      sections,
      mediaMap,
      extrasById,
      page,
      limit,
      total,
    );
  }

  /** Celebrações e comentários em lote (sem N+1); visitante só vê a contagem de celebrações. */
  private async buildFeedExtras(
    sectionIds: string[],
    viewerId: string | null,
  ): Promise<Map<string, FeedSectionExtras>> {
    const [celebrations, commentCounts] = await Promise.all([
      this.celebrations.summarize(sectionIds, viewerId),
      viewerId
        ? this.comments.countBySectionIds(sectionIds)
        : Promise.resolve(new Map<string, number>()),
    ]);
    const extras = new Map<string, FeedSectionExtras>();
    for (const id of sectionIds) {
      const celebration = celebrations.get(id);
      extras.set(id, {
        showAuthor: viewerId !== null,
        celebrationCount: celebration?.count ?? 0,
        celebratedByMe: celebration?.celebratedByMe ?? false,
        commentCount: commentCounts.get(id) ?? 0,
      });
    }
    return extras;
  }

  private groupMediaBySectionId(
    mediaItems: MediaItemEntity[],
  ): Map<string, MediaItemEntity[]> {
    const map = new Map<string, MediaItemEntity[]>();

    for (const item of mediaItems) {
      if (!map.has(item.targetId)) {
        map.set(item.targetId, []);
      }
      map.get(item.targetId)!.push(item);
    }

    return map;
  }
}
