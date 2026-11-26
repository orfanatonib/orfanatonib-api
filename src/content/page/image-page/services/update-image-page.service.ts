import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { ImageSectionReviewStatus } from "src/content/page/image-section/enums/image-section-review-status.enum";
import { AwsS3Service } from "src/infrastructure/aws/services/aws-s3.service";
import { RouteService } from "src/infrastructure/route/services/route.service";
import {
  RouteEntity,
  RouteType,
} from "src/infrastructure/route/route-page.entity";
import { MediaItemProcessor } from "src/shared/media/media-item-processor";
import { MediaItemEntity } from "src/shared/media/media-item/media-item.entity";
import { MediaStorageService } from "src/shared/media/storage/media-storage.service";
import { MediaTargetType } from "src/shared/media/media-target-type.enum";
import { ImagePageRepository } from "../repositories/image-page.repository";
import { ImageSectionRepository } from "../../image-section/repositories/image-section.repository";
import {
  ImagePageTransaction,
  ImagePageTransactionRepository,
} from "../repositories/image-page-transaction.repository";
import { UpdateImagePageDto, UpdateSectionDto } from "../dto/update-image.dto";
import { ImagePageResponseDto } from "../dto/image-page-response.dto";
import { ImageSectionEntity } from "../entities/image-section.entity";
import { ImagePageEntity } from "../entities/image-page.entity";
import { MediaChangeLog } from "../media-change-log";
import {
  IMAGE_PAGE_ROUTE_IMAGE,
  IMAGE_PAGE_ROUTE_PATH_PREFIX,
} from "../constants";
import { UpdateImagePageMediaService } from "./update-image-page-media.service";

@Injectable()
export class UpdateImagePageService {
  private readonly logger = new Logger(UpdateImagePageService.name);

  constructor(
    private readonly transactions: ImagePageTransactionRepository,
    private readonly imagePageRepository: ImagePageRepository,
    private readonly imageSectionRepository: ImageSectionRepository,
    private readonly routeService: RouteService,
    private readonly awsS3Service: AwsS3Service,
    private readonly mediaItemProcessor: MediaItemProcessor,
    private readonly mediaStorage: MediaStorageService,
    private readonly mediaService: UpdateImagePageMediaService,
  ) {}

  async updateImagePage(
    id: string,
    pageData: UpdateImagePageDto,
    filesDict: Record<string, Express.Multer.File>,
  ): Promise<ImagePageResponseDto> {
    const log = new MediaChangeLog();
    let result: ImagePageResponseDto;

    try {
      result = await this.transactions.run((tx) =>
        this.applyUpdate(tx, id, pageData, filesDict, log),
      );
    } catch (error) {
      this.logger.error("Error updating gallery. Rolling back.", error);
      await this.discardUploads(log.uploadedUrls);
      // Id inexistente (página, seções, rota ou mídia) é 404, como em vídeo e ideias.
      if (error instanceof NotFoundException) throw error;
      throw new BadRequestException(
        "Error updating gallery. No data was saved.",
      );
    }

    await this.mediaStorage.deleteAfterCommit(log.obsoleteUrls);
    return result;
  }

  private async applyUpdate(
    tx: ImagePageTransaction,
    id: string,
    pageData: UpdateImagePageDto,
    filesDict: Record<string, Express.Multer.File>,
    log: MediaChangeLog,
  ): Promise<ImagePageResponseDto> {
    await tx.lockPage(id);
    const existingPage = await this.validateImagePage(id);
    const existingSections = await this.validateSections(existingPage.id);
    const existingRoute = await this.validateRoute(existingPage.id);
    const oldMedia = await this.validateMedia(
      existingSections.map((section) => section.id),
    );

    await this.removeUnrequestedSections(
      existingSections,
      pageData.sections,
      tx,
    );
    await this.mediaService.removeUnrequested(
      oldMedia,
      pageData.sections,
      tx,
      log,
    );

    const savedPage = await tx.savePage({
      id: existingPage.id,
      name: pageData.title,
      description: pageData.description,
      public: pageData.public,
    });
    const savedRoute = await this.upsertRoute(
      existingRoute.id,
      pageData,
      savedPage.id,
    );

    const sections: ImageSectionEntity[] = [];
    const mediaMap = new Map<string, MediaItemEntity[]>();
    for (const input of pageData.sections) {
      const section = await this.saveSection(input, savedPage, tx);
      sections.push(section);
      mediaMap.set(
        section.id,
        await this.mediaService.processSectionMedia(
          input.mediaItems,
          section.id,
          filesDict,
          tx,
          log,
        ),
      );
    }

    savedPage.sections = sections;
    savedPage.route = savedRoute;
    const finalPage = await tx.savePage(savedPage);
    return ImagePageResponseDto.fromEntity(finalPage, mediaMap);
  }

  async validateImagePage(id: string): Promise<ImagePageEntity> {
    const imagePage = await this.imagePageRepository.findByIdWithSections(id);
    if (!imagePage) {
      throw new NotFoundException("Page not found");
    }
    return imagePage;
  }

  async validateSections(pageId: string): Promise<ImageSectionEntity[]> {
    const sections = await this.imageSectionRepository.findByPageId(pageId);
    if (!sections || sections.length === 0) {
      throw new NotFoundException("Gallery sections not found");
    }
    return sections;
  }

  async validateRoute(entityId: string): Promise<RouteEntity> {
    const route = await this.routeService.findRouteByEntityId(entityId);
    if (!route) {
      throw new NotFoundException("Gallery route not found");
    }
    return route;
  }

  async validateMedia(sectionIds: string[]): Promise<MediaItemEntity[]> {
    const media = await this.mediaItemProcessor.findManyMediaItemsByTargets(
      sectionIds,
      MediaTargetType.ImagesPage,
    );
    if (!media || media.length === 0) {
      throw new NotFoundException("Media associated with gallery not found");
    }
    return media;
  }

  private saveSection(
    input: UpdateSectionDto,
    page: ImagePageEntity,
    tx: ImagePageTransaction,
  ): Promise<ImageSectionEntity> {
    return tx.saveSection({
      ...(input.id
        ? { id: input.id }
        : { reviewStatus: ImageSectionReviewStatus.APPROVED }),
      caption: input.caption,
      description: input.description,
      public: input.public,
      page,
    });
  }

  private async removeUnrequestedSections(
    existing: ImageSectionEntity[],
    requested: UpdateSectionDto[],
    tx: ImagePageTransaction,
  ): Promise<void> {
    const toRemove = existing.filter(
      (section) => !requested.some((item) => item.id === section.id),
    );
    for (const section of toRemove) {
      await tx.removeSection(section);
    }
  }

  private upsertRoute(
    routeId: string,
    pageData: UpdateImagePageDto,
    imagePageId: string,
  ): Promise<RouteEntity> {
    return this.routeService.upsertRoute(routeId, {
      title: pageData.title,
      subtitle: "Image gallery page",
      idToFetch: imagePageId,
      entityType: MediaTargetType.ImagesPage,
      entityId: imagePageId,
      type: RouteType.PAGE,
      description: pageData.description,
      path: IMAGE_PAGE_ROUTE_PATH_PREFIX,
      image: IMAGE_PAGE_ROUTE_IMAGE,
      public: pageData.public,
    });
  }

  /** Melhor esforço: o que subiu antes da falha e nenhuma mídia referencia vai embora do bucket. */
  private async discardUploads(urls: string[]): Promise<void> {
    if (urls.length === 0) return;
    try {
      await this.mediaItemProcessor.discardUnreferencedUploads(urls, (url) =>
        this.awsS3Service.delete(url),
      );
    } catch (error: unknown) {
      const reason = error instanceof Error ? error.message : String(error);
      this.logger.error(`Upload órfão após rollback da galeria: ${reason}`);
    }
  }
}
