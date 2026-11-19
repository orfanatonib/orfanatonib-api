import { BadRequestException, Injectable, Logger } from "@nestjs/common";
import { DataSource } from "typeorm";
import { AwsS3Service } from "src/infrastructure/aws/services/aws-s3.service";
import { RouteService } from "src/infrastructure/route/services/route.service";
import { RouteType } from "src/infrastructure/route/route-page.entity";
import {
  PlatformType,
  MediaType,
  MediaItemEntity,
} from "src/shared/media/media-item/media-item.entity";
import { MediaItemProcessor } from "src/shared/media/media-item-processor";
import { VideosPageRepository } from "../repositories/video-page.repository";
import { CreateVideosPageDto } from "../dto/create-video-page.dto";
import { VideosPage } from "../entities/video-page.entity";
import { VideosPageResponseDto } from "../dto/video-page-response.dto";
import { MediaTargetType } from "src/shared/media/media-target-type.enum";

@Injectable()
export class CreateVideosPageService {
  private readonly logger = new Logger(CreateVideosPageService.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly routeService: RouteService,
    private readonly awsS3Service: AwsS3Service,
    private readonly mediaItemProcessor: MediaItemProcessor,
    private readonly videosPageRepo: VideosPageRepository,
  ) {}

  async execute(
    dto: CreateVideosPageDto,
    filesDict: Record<string, Express.Multer.File>,
  ): Promise<VideosPageResponseDto> {
    const { title, description, public: isPublic, videos } = dto;

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    // O processador grava as mídias fora desta transação: se um passo seguinte
    // falhar, as linhas e os objetos precisam sair junto com o rollback.
    let createdMedia: MediaItemEntity[] = [];

    try {
      const newPage = queryRunner.manager.create(VideosPage, {
        name: title,
        description,
        public: isPublic,
      });
      const savedPage = await queryRunner.manager.save(newPage);

      const path = await this.routeService.generateAvailablePath(
        title,
        "galeria_videos_",
      );
      const route = await this.routeService.createRouteWithManager(
        queryRunner.manager,
        {
          title,
          subtitle: "Página de galeria de vídeos",
          idToFetch: savedPage.id,
          path,
          entityType: MediaTargetType.VideosPage,
          entityId: savedPage.id,
          type: RouteType.PAGE,
          description,
          image:
            "https://orfanatos-nib-storage.s3.us-east-1.amazonaws.com/aux/card_videos.png",
          public: isPublic,
        },
      );

      savedPage.route = route;

      const mediaItems = (createdMedia =
        await this.mediaItemProcessor.processMediaItemsPolymorphic(
          videos.map((video) => ({
            ...video,
            mediaType: MediaType.VIDEO,
            uploadType: video.uploadType,
            platformType: video.platformType as PlatformType,
            fileField: video.fieldKey,
          })),
          savedPage.id,
          MediaTargetType.VideosPage,
          filesDict,
          this.awsS3Service.upload.bind(this.awsS3Service),
          this.awsS3Service.delete.bind(this.awsS3Service),
        ));

      const finalPage = await queryRunner.manager.save(savedPage);
      await queryRunner.commitTransaction();
      return VideosPageResponseDto.fromEntity(finalPage, mediaItems);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      await this.discardCreatedMedia(createdMedia);
      this.logger.error(
        "Error creating videos page. Rollback executed.",
        error,
      );
      throw new BadRequestException("Error creating videos page.");
    } finally {
      await queryRunner.release();
    }
  }

  /** Melhor esforço: remove linhas e objetos de mídia que ficaram sem página após o rollback. */
  private async discardCreatedMedia(items: MediaItemEntity[]): Promise<void> {
    if (items.length === 0) return;
    try {
      await this.mediaItemProcessor.deleteMediaItems(items, (url: string) =>
        this.awsS3Service.delete(url),
      );
    } catch (error: unknown) {
      const reason = error instanceof Error ? error.message : String(error);
      this.logger.error(`Mídia órfã após rollback da galeria: ${reason}`);
    }
  }
}
