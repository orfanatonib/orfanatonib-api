import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { DataSource, QueryRunner } from 'typeorm';
import { AwsS3Service } from 'src/aws/aws-s3.service';
import { RouteService } from 'src/route/route.service';
import { RouteEntity, RouteType } from 'src/route/route-page.entity';
import {
  MediaItemEntity,
  PlatformType,
  MediaType,
  UploadType,
} from 'src/share/media/media-item/media-item.entity';
import { MediaItemProcessor } from 'src/share/media/media-item-processor';
import { UpdateVideosPageDto } from '../dto/update-videos-page.dto';
import { VideosPageResponseDto } from '../dto/videos-page-response.dto';
import { VideosPageRepository } from '../video-page.repository';
import { MediaItemDto } from 'src/share/share-dto/media-item-dto';
import { MediaTargetType } from 'src/share/media/media-target-type.enum';

@Injectable()
export class UpdateVideosPageService {
  private readonly logger = new Logger(UpdateVideosPageService.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly awsS3Service: AwsS3Service,
    private readonly routeService: RouteService,
    private readonly mediaItemProcessor: MediaItemProcessor,
    private readonly videosPageRepo: VideosPageRepository,
  ) {
  }

  async execute(
    id: string,
    dto: UpdateVideosPageDto,
    filesDict: Record<string, Express.Multer.File>,
  ): Promise<VideosPageResponseDto> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const existingPage = await this.videosPageRepo.findById(id);
      if (!existingPage) {
        throw new NotFoundException('Page not found');
      }

      const existingMedia = await this.mediaItemProcessor.findManyMediaItemsByTargets(
        [existingPage.id],
        'VideosPage',
      );

      await this.deleteMedia(existingMedia, dto.videos, queryRunner);

      existingPage.name = dto.title;
      existingPage.description = dto.description;
      existingPage.public = dto.public;
      const updatedPage = await queryRunner.manager.save(existingPage);

      const savedRoute = await this.upsertRoute(existingPage.route.id, dto, updatedPage.id);

      const mediaItems = await this.processPageMedia(
        dto.videos,
        updatedPage.id,
        existingMedia,
        filesDict,
        queryRunner,
      );

      updatedPage.route = savedRoute;
      const finalPage = await queryRunner.manager.save(updatedPage);

      await queryRunner.commitTransaction();
      return VideosPageResponseDto.fromEntity(finalPage, mediaItems);
    } catch (error) {
      this.logger.error('Error updating videos page. Rolling back.', error.stack);
      await queryRunner.rollbackTransaction();
      throw new BadRequestException('Error updating videos page.');
    } finally {
      await queryRunner.release();
    }
  }

  private async upsertRoute(
    routeId: string,
    pageData: UpdateVideosPageDto,
    videoPageId: string,
  ): Promise<RouteEntity> {
    const routeData: Partial<RouteEntity> = {
      title: pageData.title,
      subtitle: 'Videos page',
      idToFetch: videoPageId,
      entityType:MediaTargetType.VideosPage,
      entityId: videoPageId,
      type: RouteType.PAGE,
      description: pageData.description,
      path: 'galeria_videos_',
      image: 'https://orfanatos-nib-storage.s3.us-east-1.amazonaws.com/aux/card_videos.png',      
      public: pageData.public,
    };
    return this.routeService.upsertRoute(routeId, routeData);
  }

  private async deleteMedia(
    existingMedia: MediaItemEntity[],
    requestedMedia: any[],
    queryRunner: QueryRunner,
  ): Promise<void> {
    const requestedMediaIds = requestedMedia
      .map((media) => media.id)
      .filter((id): id is string => typeof id === 'string' && id.length > 0);
    const mediaToRemove = existingMedia.filter(
      (existing) => existing.id && !requestedMediaIds.includes(existing.id),
    );

    for (const media of mediaToRemove) {
      if (!media.id) {
        continue;
      }

      if (media.isLocalFile && media.url) {
        try {
          await this.awsS3Service.delete(media.url);
        } catch (error) {
          this.logger.error(`Error deleting file from S3: ${media.url}`, error.stack);
          throw new BadRequestException(`Error deleting file from S3: ${media.url}`);
        }
      } else {
      }

      await queryRunner.manager.remove(MediaItemEntity, media);
    }
  }

  private async processPageMedia(
    mediaItems: MediaItemDto[],
    pageId: string,
    oldMedia: MediaItemEntity[],
    filesDict: Record<string, Express.Multer.File>,
    queryRunner: QueryRunner,
  ): Promise<MediaItemEntity[]> {
    const processed: MediaItemEntity[] = [];
    for (const mediaInput of mediaItems) {
      if (mediaInput.id) {
        const saved = await this.upsertMedia(mediaInput, pageId, filesDict, queryRunner);
        processed.push(saved);
      } else {
        const saved = await this.addMedia(mediaInput, pageId, filesDict, queryRunner);
        processed.push(saved);
      }
    }
    return processed;
  }

  private async addMedia(
    mediaInput: MediaItemDto,
    targetId: string,
    filesDict: Record<string, Express.Multer.File>,
    queryRunner: QueryRunner,
  ): Promise<MediaItemEntity> {
    const media = new MediaItemEntity();
    Object.assign(media, this.mediaItemProcessor.buildBaseMediaItem(
      {
        ...mediaInput,
        mediaType: MediaType.VIDEO,
        uploadType: mediaInput.uploadType as UploadType,
        platformType: mediaInput.platformType as PlatformType,
      },
      targetId,
      MediaTargetType.VideosPage,
    ));

    if (mediaInput.uploadType === UploadType.UPLOAD && mediaInput.isLocalFile) {
      const key = mediaInput.fieldKey ?? mediaInput.url;
      if (!key) {
        throw new Error(`File missing for upload: no fieldKey or url provided`);
      }
      const file = filesDict[key];
      if (!file) {
        throw new Error(`File not found for upload: ${key}`);
      }

      media.url = await this.awsS3Service.upload(file);
      media.isLocalFile = true;
      media.originalName = file.originalname;
      media.size = file.size;
    } else if (mediaInput.uploadType === UploadType.LINK || mediaInput.isLocalFile === false) {
      if (!mediaInput.url) {
        throw new BadRequestException('URL is required for link type videos.');
      }
      media.url = mediaInput.url;
      media.isLocalFile = false;
      media.platformType = mediaInput.platformType || PlatformType.YOUTUBE;
    } else {
      throw new BadRequestException(`Invalid media type: ${mediaInput.uploadType}`);
    }

    return queryRunner.manager.save(MediaItemEntity, media);
  }

  private async upsertMedia(
    mediaInput: MediaItemDto,
    targetId: string,
    filesDict: Record<string, Express.Multer.File>,
    queryRunner: QueryRunner,
  ): Promise<MediaItemEntity> {
    const existingMedia = await queryRunner.manager.findOne(MediaItemEntity, { where: { id: mediaInput.id } });
    if (!existingMedia) {
      throw new NotFoundException(`Media with id ${mediaInput.id} not found.`);
    }

    const media = new MediaItemEntity();
    Object.assign(media, this.mediaItemProcessor.buildBaseMediaItem(
      {
        ...mediaInput,
        mediaType: MediaType.VIDEO,
        uploadType: mediaInput.uploadType as UploadType,
        platformType: mediaInput.platformType as PlatformType,
      },
      targetId,
      'VideosPage',
    ));
    media.id = mediaInput.id || '';

    if (mediaInput.uploadType === UploadType.UPLOAD) {
      const key = mediaInput.fieldKey ?? '';
      const file = filesDict[key];

      if (file) {
        media.url = await this.awsS3Service.upload(file);
        media.isLocalFile = true;
        media.originalName = file.originalname;
        media.size = file.size;
      } else {
        media.url = existingMedia.url;
        media.isLocalFile = existingMedia.isLocalFile;
        media.originalName = existingMedia.originalName;
        media.size = existingMedia.size;
      }
    } else if (mediaInput.uploadType === UploadType.LINK) {
      if (!mediaInput.url) {
        throw new BadRequestException('URL is required for link type videos.');
      }
      media.url = mediaInput.url;
      media.isLocalFile = false;
      media.platformType = mediaInput.platformType || PlatformType.YOUTUBE;
    } else {
      throw new BadRequestException(`Invalid media type: ${mediaInput.uploadType}`);
    }

    return queryRunner.manager.save(MediaItemEntity, media);
  }
}