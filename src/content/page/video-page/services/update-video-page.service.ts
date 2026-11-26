import {
  BadRequestException,
  HttpException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { RouteService } from "src/infrastructure/route/services/route.service";
import {
  RouteEntity,
  RouteType,
} from "src/infrastructure/route/route-page.entity";
import { MediaItemEntity } from "src/shared/media/media-item/media-item.entity";
import { MediaTargetType } from "src/shared/media/media-target-type.enum";
import { MediaStorageService } from "src/shared/media/storage/media-storage.service";
import { UpdateVideosPageDto } from "../dto/update-video-page.dto";
import { VideosPageResponseDto } from "../dto/video-page-response.dto";
import { VideosPageRepository } from "../repositories/video-page.repository";
import {
  VIDEO_PAGE_ROUTE_IMAGE,
  VIDEO_PAGE_ROUTE_PREFIX,
  VideoPageMessages,
} from "../constants";
import { errorReason, findRemovedMedia, localFileUrls } from "../utils";
import { VideoPageMediaService } from "./video-page-media.service";

@Injectable()
export class UpdateVideosPageService {
  private readonly logger = new Logger(UpdateVideosPageService.name);

  constructor(
    private readonly routeService: RouteService,
    private readonly mediaStorage: MediaStorageService,
    private readonly videoMedia: VideoPageMediaService,
    private readonly videosPageRepo: VideosPageRepository,
  ) {}

  /**
   * Ordem segura para o bucket: objetos novos sobem → linhas gravadas na
   * transação → só depois do commit saem os objetos antigos. Se algo falha, os
   * novos são descartados e os antigos continuam referenciados.
   */
  async execute(
    id: string,
    dto: UpdateVideosPageDto,
    filesDict: Record<string, Express.Multer.File>,
  ): Promise<VideosPageResponseDto> {
    const existingPage = await this.videosPageRepo.findById(id);
    if (!existingPage) {
      throw new NotFoundException(VideoPageMessages.PAGE_NOT_FOUND);
    }

    const batch = this.mediaStorage.newBatch();
    const obsoleteUrls: string[] = [];

    try {
      const response = await this.videosPageRepo.runInTransaction(
        async (manager) => {
          if (!(await this.videosPageRepo.lockPage(manager, id))) {
            throw new NotFoundException(VideoPageMessages.PAGE_NOT_FOUND);
          }
          const existingMedia = await this.videosPageRepo.findMedia(
            manager,
            id,
          );
          const removed = findRemovedMedia(existingMedia, dto.videos);
          await this.videosPageRepo.removeMedia(manager, removed);
          obsoleteUrls.push(...localFileUrls(removed));

          existingPage.name = dto.title;
          existingPage.description = dto.description;
          existingPage.public = dto.public;
          const updatedPage = await this.videosPageRepo.savePage(
            manager,
            existingPage,
          );

          const savedRoute = await this.upsertRoute(
            existingPage.route.id,
            dto,
            updatedPage.id,
          );

          const mediaItems: MediaItemEntity[] = [];
          for (const input of dto.videos) {
            const existing = input.id
              ? existingMedia.find((media) => media.id === input.id)
              : undefined;
            if (input.id && !existing) {
              throw new NotFoundException(
                `Media with id ${input.id} not found.`,
              );
            }
            const { media, obsoleteUrl } = await this.videoMedia.materialize(
              input,
              updatedPage.id,
              filesDict,
              batch,
              existing,
            );
            if (obsoleteUrl) obsoleteUrls.push(obsoleteUrl);
            mediaItems.push(
              await this.videosPageRepo.saveMedia(manager, media),
            );
          }

          updatedPage.route = savedRoute;
          const finalPage = await this.videosPageRepo.savePage(
            manager,
            updatedPage,
          );
          return VideosPageResponseDto.fromEntity(finalPage, mediaItems);
        },
      );
      batch.commit();
      await this.mediaStorage.deleteAfterCommit(obsoleteUrls);
      return response;
    } catch (error) {
      await batch.discard();
      if (error instanceof HttpException) throw error;
      this.logger.error(
        `Error updating videos page ${id}. Rolling back: ${errorReason(error)}`,
      );
      throw new BadRequestException(VideoPageMessages.UPDATE_FAILED);
    }
  }

  private upsertRoute(
    routeId: string,
    pageData: UpdateVideosPageDto,
    videoPageId: string,
  ): Promise<RouteEntity> {
    return this.routeService.upsertRoute(routeId, {
      title: pageData.title,
      subtitle: "Videos page",
      idToFetch: videoPageId,
      entityType: MediaTargetType.VideosPage,
      entityId: videoPageId,
      type: RouteType.PAGE,
      description: pageData.description,
      path: VIDEO_PAGE_ROUTE_PREFIX,
      image: VIDEO_PAGE_ROUTE_IMAGE,
      public: pageData.public,
    });
  }
}
