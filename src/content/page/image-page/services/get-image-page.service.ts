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

@Injectable()
export class GetImagePageService {
  private readonly logger = new Logger(GetImagePageService.name);

  constructor(
    private readonly imagePageRepository: ImagePageRepository,
    private readonly sectionRepository: ImageSectionRepository,
    private readonly mediaItemProcessor: MediaItemProcessor,
    private readonly authContext: AuthContextService,
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

    const loggedIn = await this.authContext.isLoggedIn(req);

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

    return PaginatedImageSectionResponseDto.fromEntities(
      imagePage,
      sections,
      mediaMap,
      page,
      limit,
      total,
    );
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
