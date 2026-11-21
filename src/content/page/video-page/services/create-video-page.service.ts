import {
  BadRequestException,
  HttpException,
  Injectable,
  Logger,
} from "@nestjs/common";
import { RouteService } from "src/infrastructure/route/services/route.service";
import { RouteType } from "src/infrastructure/route/route-page.entity";
import { MediaItemEntity } from "src/shared/media/media-item/media-item.entity";
import { MediaTargetType } from "src/shared/media/media-target-type.enum";
import { MediaStorageService } from "src/shared/media/storage/media-storage.service";
import { VideosPageRepository } from "../repositories/video-page.repository";
import { CreateVideosPageDto } from "../dto/create-video-page.dto";
import { VideosPageResponseDto } from "../dto/video-page-response.dto";
import {
  VIDEO_PAGE_ROUTE_IMAGE,
  VIDEO_PAGE_ROUTE_PREFIX,
  VIDEO_PAGE_ROUTE_SUBTITLE,
  VideoPageMessages,
} from "../constants";
import { errorReason } from "../utils";
import { VideoPageMediaService } from "./video-page-media.service";

@Injectable()
export class CreateVideosPageService {
  private readonly logger = new Logger(CreateVideosPageService.name);

  constructor(
    private readonly routeService: RouteService,
    private readonly mediaStorage: MediaStorageService,
    private readonly videoMedia: VideoPageMediaService,
    private readonly videosPageRepo: VideosPageRepository,
  ) {}

  async execute(
    dto: CreateVideosPageDto,
    filesDict: Record<string, Express.Multer.File>,
  ): Promise<VideosPageResponseDto> {
    const { title, description, public: isPublic, videos } = dto;
    // Linhas e página na mesma transação; objetos novos só ficam se ela confirmar.
    const batch = this.mediaStorage.newBatch();

    try {
      const response = await this.videosPageRepo.runInTransaction(
        async (manager) => {
          const savedPage = await this.videosPageRepo.createPage(manager, {
            name: title,
            description,
            public: isPublic,
          });

          const path = await this.routeService.generateAvailablePath(
            title,
            VIDEO_PAGE_ROUTE_PREFIX,
          );
          savedPage.route = await this.routeService.createRouteWithManager(
            manager,
            {
              title,
              subtitle: VIDEO_PAGE_ROUTE_SUBTITLE,
              idToFetch: savedPage.id,
              path,
              entityType: MediaTargetType.VideosPage,
              entityId: savedPage.id,
              type: RouteType.PAGE,
              description,
              image: VIDEO_PAGE_ROUTE_IMAGE,
              public: isPublic,
            },
          );

          const mediaItems: MediaItemEntity[] = [];
          for (const video of videos) {
            const { media } = await this.videoMedia.materialize(
              video,
              savedPage.id,
              filesDict,
              batch,
            );
            mediaItems.push(
              await this.videosPageRepo.saveMedia(manager, media),
            );
          }

          const finalPage = await this.videosPageRepo.savePage(
            manager,
            savedPage,
          );
          return VideosPageResponseDto.fromEntity(finalPage, mediaItems);
        },
      );
      batch.commit();
      return response;
    } catch (error) {
      await batch.discard();
      if (error instanceof HttpException) throw error;
      this.logger.error(
        `Error creating videos page. Rollback executed: ${errorReason(error)}`,
      );
      throw new BadRequestException(VideoPageMessages.CREATE_FAILED);
    }
  }
}
