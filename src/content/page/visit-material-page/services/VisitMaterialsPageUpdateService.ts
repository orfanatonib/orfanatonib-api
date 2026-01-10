import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { DataSource, QueryRunner } from 'typeorm';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { AwsS3Service } from 'src/infrastructure/aws/aws-s3.service';
import { RouteService } from 'src/infrastructure/route/route.service';
import { RouteEntity, RouteType } from 'src/infrastructure/route/route-page.entity';
import { MediaTargetType } from 'src/shared/media/media-target-type.enum';
import { MediaItemProcessor } from 'src/shared/media/media-item-processor';
import { MediaItemEntity, MediaType, UploadType } from 'src/shared/media/media-item/media-item.entity';
import { VisitMaterialsPageEntity } from '../entities/visit-material-page.entity';
import { MediaItemDto } from 'src/shared/dto/media-item-dto';
import { UpdateVisitMaterialsPageDto } from '../dto/update-visit-material.dto';
import { VisitMaterialsPageResponseDTO } from '../dto/visit-material-response.dto';

@Injectable()
export class VisitMaterialsPageUpdateService {
  private readonly logger = new Logger(VisitMaterialsPageUpdateService.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly s3: AwsS3Service,
    private readonly routeService: RouteService,
    private readonly mediaItemProcessor: MediaItemProcessor,
  ) {
  }

  async updateFromRaw(
    id: string,
    raw: string,
    files: Express.Multer.File[],
  ): Promise<VisitMaterialsPageResponseDTO> {
    if (!raw) {
      throw new BadRequestException('visitMaterialsPageData is required.');
    }

    try {
      const parsed = JSON.parse(raw);
      const dto = plainToInstance(UpdateVisitMaterialsPageDto, parsed);
      const errors = await validate(dto, { whitelist: true, forbidNonWhitelisted: true });

      if (errors.length > 0) {
        throw new BadRequestException('Invalid data in request');
      }

      const filesDict = Object.fromEntries(files.map((f) => [f.fieldname, f]));

      const result = await this.updateVisitMaterialsPage(id, dto, filesDict);
      
      const mediaItems = await this.mediaItemProcessor.findMediaItemsByTarget(
        result.id,
        MediaTargetType.VisitMaterialsPage,
      );

      return VisitMaterialsPageResponseDTO.fromEntity(result, mediaItems);
    } catch (err) {
      this.logger.error(`Error processing data for update ID=${id}`, err);
      throw new BadRequestException('Error updating materials page: ' + err.message);
    }
  }

  async updateVisitMaterialsPage(
    id: string,
    dto: any,
    filesDict: Record<string, Express.Multer.File>,
  ): Promise<VisitMaterialsPageEntity> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const existingPage = await this.validatePage(id, queryRunner);
      const existingRoute = await this.validateRoute(existingPage.id);
      const existingVideos = await this.validateVideoMedia(existingPage.id);
      const existingDocuments = await this.validateDocumentMedia(existingPage.id);
      const existingImages = await this.validateImageMedia(existingPage.id);
      const existingAudios = await this.validateAudioMedia(existingPage.id);

      const { pageTitle, pageSubtitle, pageDescription, videos, documents, images, audios, currentWeek, testament } = dto;

      await this.deleteVideoMedia(existingVideos, videos);
      await this.deleteDocumentMedia(existingDocuments, documents);
      await this.deleteImageMedia(existingImages, images);
      await this.deleteAudioMedia(existingAudios, audios);

      for (const video of videos || []) {
        if (video.id) {
          await this.upsertVideoMedia(video, existingPage.id, filesDict, queryRunner);
        } else {
          await this.addVideoMedia(video, existingPage.id, filesDict, queryRunner);
        }
      }
      for (const document of documents || []) {
        if (document.id) {
          await this.upsertDocumentMedia(document, existingPage.id, filesDict, queryRunner);
        } else {
          await this.addDocumentMedia(document, existingPage.id, filesDict, queryRunner);
        }
      }
      for (const image of images || []) {
        if (image.id) {
          await this.upsertImageMedia(image, existingPage.id, filesDict, queryRunner);
        } else {
          await this.addImageMedia(image, existingPage.id, filesDict, queryRunner);
        }
      }
      for (const audio of audios || []) {
        if (audio.id) {
          await this.upsertAudioMedia(audio, existingPage.id, filesDict, queryRunner);
        } else {
          await this.addAudioMedia(audio, existingPage.id, filesDict, queryRunner);
        }
      }

      const routeUpsert = await this.upsertRoute(existingRoute.id, { pageTitle, pageSubtitle, pageDescription, currentWeek }, existingPage.id, existingRoute.public, existingRoute.current);

      existingPage.title = pageTitle;
      existingPage.subtitle = pageSubtitle;
      existingPage.description = pageDescription;
      existingPage.currentWeek = currentWeek;
      if (testament !== undefined) {
        existingPage.testament = testament;
      }
      existingPage.route = routeUpsert;
      const updatedPage = await queryRunner.manager.save(VisitMaterialsPageEntity, existingPage);

      await queryRunner.commitTransaction();
      return updatedPage;
    } catch (error) {
      this.logger.error('Error updating page', error.stack);
      await queryRunner.rollbackTransaction();
      throw new BadRequestException('Error updating materials page.');
    } finally {
      await queryRunner.release();
    }
  }

  private async upsertRoute(
    routeId: string,
    pageData: { pageTitle: string; pageSubtitle: string; pageDescription: string, currentWeek: boolean },
    visitMaterialsPageId: string,
    existingRoutePublic: boolean,
    existingRouteCurrent?: boolean,
  ): Promise<RouteEntity> {
    const routeData: Partial<RouteEntity> = {
      title: pageData.pageTitle,
      subtitle: pageData.pageSubtitle,
      description: pageData.pageDescription,
      idToFetch: visitMaterialsPageId,
      entityType: 'VisitMaterialsPage',
      entityId: visitMaterialsPageId,
      public: existingRoutePublic,
      current: existingRouteCurrent,
      type: RouteType.PAGE,
      path: 'materiais_visita_',
      image: 'https://orfanatos-nib-storage.s3.us-east-1.amazonaws.com/aux/card_materiais.png',
    };
    return this.routeService.upsertRoute(routeId, routeData);
  }

  private async validatePage(id: string, queryRunner: QueryRunner): Promise<VisitMaterialsPageEntity> {
    const page = await queryRunner.manager.findOne(VisitMaterialsPageEntity, {
      where: { id },
      relations: ['route'],
    });
    if (!page) {
      throw new NotFoundException('Page not found');
    }
    return page;
  }

  private async validateRoute(entityId: string): Promise<RouteEntity> {
    const route = await this.routeService.findRouteByEntityId(entityId);
    if (!route) {
      throw new NotFoundException('Route not found');
    }
    return route;
  }

  private async validateVideoMedia(pageId: string): Promise<MediaItemEntity[]> {
    const items = await this.mediaItemProcessor.findMediaItemsByTarget(pageId, MediaTargetType.VisitMaterialsPage);
    return items.filter(item => item.mediaType === MediaType.VIDEO);
  }

  private async validateDocumentMedia(pageId: string): Promise<MediaItemEntity[]> {
    const items = await this.mediaItemProcessor.findMediaItemsByTarget(pageId, MediaTargetType.VisitMaterialsPage);
    return items.filter(item => item.mediaType === MediaType.DOCUMENT);
  }

  private async validateImageMedia(pageId: string): Promise<MediaItemEntity[]> {
    const items = await this.mediaItemProcessor.findMediaItemsByTarget(pageId, MediaTargetType.VisitMaterialsPage);
    return items.filter(item => item.mediaType === MediaType.IMAGE);
  }

  private async validateAudioMedia(pageId: string): Promise<MediaItemEntity[]> {
    const items = await this.mediaItemProcessor.findMediaItemsByTarget(pageId, MediaTargetType.VisitMaterialsPage);
    return items.filter(item => item.mediaType === MediaType.AUDIO);
  }

  private async deleteVideoMedia(
    existingVideos: MediaItemEntity[],
    incomingVideos: any[],
  ): Promise<void> {
    const incomingIds = new Set((incomingVideos || []).map((v) => v.id).filter(Boolean));
    const videosToRemove = existingVideos.filter((video) => !incomingIds.has(video.id));
    if (videosToRemove.length > 0) {
      await this.mediaItemProcessor.deleteMediaItems(videosToRemove, this.s3.delete.bind(this.s3));
    }
  }

  private async deleteDocumentMedia(
    existingDocuments: MediaItemEntity[],
    incomingDocuments: any[],
  ): Promise<void> {
    const incomingIds = new Set((incomingDocuments || []).map((d) => d.id).filter(Boolean));
    const documentsToRemove = existingDocuments.filter((doc) => !incomingIds.has(doc.id));
    if (documentsToRemove.length > 0) {
      await this.mediaItemProcessor.deleteMediaItems(documentsToRemove, this.s3.delete.bind(this.s3));
    }
  }

  private async deleteImageMedia(
    existingImages: MediaItemEntity[],
    incomingImages: any[],
  ): Promise<void> {
    const incomingIds = new Set((incomingImages || []).map((i) => i.id).filter(Boolean));
    const imagesToRemove = existingImages.filter((img) => !incomingIds.has(img.id));
    if (imagesToRemove.length > 0) {
      await this.mediaItemProcessor.deleteMediaItems(imagesToRemove, this.s3.delete.bind(this.s3));
    }
  }

  private async deleteAudioMedia(
    existingAudios: MediaItemEntity[],
    incomingAudios: any[],
  ): Promise<void> {
    const incomingIds = new Set((incomingAudios || []).map((a) => a.id).filter(Boolean));
    const audiosToRemove = existingAudios.filter((audio) => !incomingIds.has(audio.id));
    if (audiosToRemove.length > 0) {
      await this.mediaItemProcessor.deleteMediaItems(audiosToRemove, this.s3.delete.bind(this.s3));
    }
  }
  private async addVideoMedia(
    videoInput: MediaItemDto,
    pageId: string,
    filesDict: Record<string, Express.Multer.File>,
    queryRunner: QueryRunner,
  ): Promise<MediaItemEntity> {
    const media = this.mediaItemProcessor.buildBaseMediaItem(
      { ...videoInput, mediaType: MediaType.VIDEO },
      pageId,
      MediaTargetType.VisitMaterialsPage,
    );

    const isUpload = videoInput.uploadType === UploadType.UPLOAD || videoInput.isLocalFile === true;

    if (isUpload) {
      media.platformType = undefined;
      if (!videoInput.fieldKey) {
        throw new BadRequestException(`FieldKey missing for media "${videoInput.title}"`);
      }
      const file = filesDict[videoInput.fieldKey];
      if (!file) {
        throw new BadRequestException(`File missing for media "${videoInput.title}"`);
      }

      media.url = await this.s3.upload(file);
      media.isLocalFile = videoInput.isLocalFile;
      media.originalName = file.originalname;
      media.size = file.size;
      media.platformType = undefined;
    } else {
      media.title = videoInput.title || media.title;
      media.description = videoInput.description || media.description;
      media.uploadType = videoInput.uploadType || media.uploadType;
      media.platformType = videoInput.platformType || media.platformType;
      media.mediaType = videoInput.mediaType || media.mediaType;
      media.url = videoInput.url?.trim() || media.url;
      media.originalName = videoInput.originalName || media.originalName;
      media.isLocalFile = videoInput.isLocalFile || media.isLocalFile;
      media.size = videoInput.size || media.size;
    }

    return this.mediaItemProcessor.saveMediaItem(media);
  }

  private async addDocumentMedia(
    documentInput: any,
    pageId: string,
    filesDict: Record<string, Express.Multer.File>,
    queryRunner: QueryRunner,
  ): Promise<MediaItemEntity> {
    const media = this.mediaItemProcessor.buildBaseMediaItem(
      { ...documentInput, mediaType: MediaType.DOCUMENT },
      pageId,
      MediaTargetType.VisitMaterialsPage,
    );

    if (documentInput.uploadType === UploadType.UPLOAD || documentInput.isLocalFile === true) {
      media.platformType = undefined;
      const file = filesDict[documentInput.fieldKey];
      if (!file) {
        throw new BadRequestException(`File missing for document "${documentInput.title}"`);
      }
      media.url = await this.s3.upload(file);
      media.isLocalFile = documentInput.isLocalFile;
      media.originalName = file.originalname;
      media.size = file.size;
    } else {
      media.title = documentInput.title || media.title;
      media.description = documentInput.description || media.description;
      media.uploadType = documentInput.uploadType || media.uploadType;
      media.platformType = documentInput.platformType || media.platformType;
      media.mediaType = documentInput.mediaType || media.mediaType;
      media.url = documentInput.url?.trim() || media.url;
      media.originalName = documentInput.originalName || media.originalName;
      media.isLocalFile = documentInput.isLocalFile || media.isLocalFile;
      media.size = documentInput.size || media.size;
    }

    return this.mediaItemProcessor.saveMediaItem(media);
  }

  private async addImageMedia(
    imageInput: any,
    pageId: string,
    filesDict: Record<string, Express.Multer.File>,
    queryRunner: QueryRunner,
  ): Promise<MediaItemEntity> {
    const media = this.mediaItemProcessor.buildBaseMediaItem(
      { ...imageInput, mediaType: MediaType.IMAGE },
      pageId,
      MediaTargetType.VisitMaterialsPage,
    );

    if (imageInput.uploadType === UploadType.UPLOAD || imageInput.isLocalFile === true) {
      media.platformType = undefined;
      const file = filesDict[imageInput.fieldKey];
      if (!file) {
        throw new BadRequestException(`File missing for image "${imageInput.title}"`);
      }
      media.url = await this.s3.upload(file);
      media.isLocalFile = imageInput.isLocalFile;
      media.originalName = file.originalname;
      media.size = file.size;
    } else {
      media.title = imageInput.title || media.title;
      media.description = imageInput.description || media.description;
      media.uploadType = imageInput.uploadType || media.uploadType;
      media.platformType = imageInput.platformType || media.platformType;
      media.mediaType = imageInput.mediaType || media.mediaType;
      media.url = imageInput.url?.trim() || media.url;
      media.originalName = imageInput.originalName || media.originalName;
      media.isLocalFile = imageInput.isLocalFile || media.isLocalFile;
      media.size = imageInput.size || media.size;
    }

    return this.mediaItemProcessor.saveMediaItem(media);
  }


  private async addAudioMedia(
    audioInput: any,
    pageId: string,
    filesDict: Record<string, Express.Multer.File>,
    queryRunner: QueryRunner,
  ): Promise<MediaItemEntity> {
    const media = this.mediaItemProcessor.buildBaseMediaItem(
      { ...audioInput, mediaType: MediaType.AUDIO },
      pageId,
      MediaTargetType.VisitMaterialsPage,
    );

    if (audioInput.uploadType === UploadType.UPLOAD || audioInput.isLocalFile === true) {
      media.platformType = undefined;
      const file = filesDict[audioInput.fieldKey];
      if (!file) {
        throw new BadRequestException(`File missing for audio "${audioInput.title}"`);
      }
      media.url = await this.s3.upload(file);
      media.isLocalFile = true;
      media.originalName = file.originalname;
      media.size = file.size;
    } else {
      media.title = audioInput.title || media.title;
      media.description = audioInput.description || media.description;
      media.uploadType = audioInput.uploadType || media.uploadType;
      media.platformType = audioInput.platformType || media.platformType;
      media.mediaType = audioInput.mediaType || media.mediaType;
      media.url = audioInput.url?.trim() || media.url;
      media.originalName = audioInput.originalName || media.originalName;
      media.isLocalFile = audioInput.isLocalFile || media.isLocalFile;
      media.size = audioInput.size || media.size;
      media.isLocalFile = false;
    }

    return this.mediaItemProcessor.saveMediaItem(media);
  }


  private async upsertVideoMedia(
    videoInput: MediaItemDto,
    pageId: string,
    filesDict: Record<string, Express.Multer.File>,
    queryRunner: QueryRunner,
  ): Promise<MediaItemEntity> {
    const media = this.mediaItemProcessor.buildBaseMediaItem(
      { ...videoInput, mediaType: MediaType.VIDEO },
      pageId,
      MediaTargetType.VisitMaterialsPage,
    );

    if (videoInput.uploadType === UploadType.UPLOAD && videoInput.isLocalFile && videoInput.fieldKey) {
      const existing = await queryRunner.manager.findOne(MediaItemEntity, {
        where: { id: videoInput.id },
      });
      if (existing && existing.isLocalFile) {
        await this.s3.delete(existing.url);
      }
      const file = filesDict[videoInput.fieldKey];
      if (!file) {
        throw new BadRequestException(`File missing for video "${videoInput.title}"`);
      }
      media.url = await this.s3.upload(file);
      media.description = videoInput.description || media.description;
      media.isLocalFile = videoInput.isLocalFile;
      media.originalName = file.originalname;
      media.size = file.size;
    } else {
      media.title = videoInput.title || media.title;
      media.description = videoInput.description || media.description;
      media.uploadType = videoInput.uploadType || media.uploadType;
      media.platformType = videoInput.platformType || media.platformType;
      media.mediaType = videoInput.mediaType || media.mediaType;
      media.url = videoInput.url?.trim() || media.url;
      media.originalName = videoInput.originalName || media.originalName;
      media.isLocalFile = videoInput.isLocalFile || media.isLocalFile;
      media.size = videoInput.size || media.size;
    }
    return this.mediaItemProcessor.upsertMediaItem(videoInput.id, media);
  }

  private async upsertDocumentMedia(
    documentInput: MediaItemDto,
    pageId: string,
    filesDict: Record<string, Express.Multer.File>,
    queryRunner: QueryRunner,
  ): Promise<MediaItemEntity> {
    const media = this.mediaItemProcessor.buildBaseMediaItem(
      { ...documentInput, mediaType: MediaType.DOCUMENT },
      pageId,
      MediaTargetType.VisitMaterialsPage,
    );
    if (documentInput.uploadType === UploadType.UPLOAD && documentInput.isLocalFile && documentInput.fieldKey) {
      const existing = await queryRunner.manager.findOne(MediaItemEntity, {
        where: { id: documentInput.id },
      });
      if (existing && existing.isLocalFile) {
        await this.s3.delete(existing.url);
      }
      const file = filesDict[documentInput.fieldKey];
      if (!file) {
        throw new BadRequestException(`File missing for document "${documentInput.title}"`);
      }
      media.url = await this.s3.upload(file);
      media.isLocalFile = true;
      media.originalName = file.originalname;
      media.size = file.size;
    } else {
      media.title = documentInput.title || media.title;
      media.description = documentInput.description || media.description;
      media.uploadType = documentInput.uploadType || media.uploadType;
      media.platformType = documentInput.platformType || media.platformType;
      media.mediaType = documentInput.mediaType || media.mediaType;
      media.url = documentInput.url?.trim() || media.url;
      media.originalName = documentInput.originalName || media.originalName;
      media.isLocalFile = documentInput.isLocalFile || media.isLocalFile;
      media.size = documentInput.size || media.size;
    }
    return this.mediaItemProcessor.upsertMediaItem(documentInput.id, media);
  }

  private async upsertImageMedia(
    imageInput: MediaItemDto,
    pageId: string,
    filesDict: Record<string, Express.Multer.File>,
    queryRunner: QueryRunner,
  ): Promise<MediaItemEntity> {
    const media = this.mediaItemProcessor.buildBaseMediaItem(
      { ...imageInput, mediaType: MediaType.IMAGE },
      pageId,
      MediaTargetType.VisitMaterialsPage,
    );
    if (imageInput.uploadType === UploadType.UPLOAD && imageInput.isLocalFile && imageInput.fieldKey) {
      const existing = await queryRunner.manager.findOne(MediaItemEntity, {
        where: { id: imageInput.id },
      });
      if (existing && existing.isLocalFile) {
        await this.s3.delete(existing.url);
      }
      const file = filesDict[imageInput.fieldKey];
      if (!file) {
        throw new BadRequestException(`File missing for image "${imageInput.title}"`);
      }
      media.url = await this.s3.upload(file);
      media.isLocalFile = true;
      media.originalName = file.originalname;
      media.size = file.size;
    } else {
      media.title = imageInput.title || media.title;
      media.description = imageInput.description || media.description;
      media.uploadType = imageInput.uploadType || media.uploadType;
      media.platformType = imageInput.platformType || media.platformType;
      media.mediaType = imageInput.mediaType || media.mediaType;
      media.url = imageInput.url?.trim() || media.url;
      media.originalName = imageInput.originalName || media.originalName;
      media.isLocalFile = imageInput.isLocalFile || media.isLocalFile;
      media.size = imageInput.size || media.size;
    }
    return this.mediaItemProcessor.upsertMediaItem(imageInput.id, media);
  }

  private async upsertAudioMedia(
    audioInput: MediaItemDto,
    pageId: string,
    filesDict: Record<string, Express.Multer.File>,
    queryRunner: QueryRunner,
  ): Promise<MediaItemEntity> {
    const media = this.mediaItemProcessor.buildBaseMediaItem(
      { ...audioInput, mediaType: MediaType.AUDIO },
      pageId,
      MediaTargetType.VisitMaterialsPage,
    );
    if (audioInput.uploadType === UploadType.UPLOAD && audioInput.isLocalFile && audioInput.fieldKey) {
      const existing = await queryRunner.manager.findOne(MediaItemEntity, {
        where: { id: audioInput.id },
      });
      if (existing && existing.isLocalFile) {
        await this.s3.delete(existing.url);
      }
      const file = filesDict[audioInput.fieldKey];
      if (!file) {
        throw new BadRequestException(`File missing for audio "${audioInput.title}"`);
      }
      media.url = await this.s3.upload(file);
      media.isLocalFile = audioInput.isLocalFile;
      media.originalName = file.originalname;
      media.size = file.size;
    } else {
      media.title = audioInput.title || media.title;
      media.description = audioInput.description || media.description;
      media.uploadType = audioInput.uploadType || media.uploadType;
      media.platformType = audioInput.platformType || media.platformType;
      media.mediaType = audioInput.mediaType || media.mediaType;
      media.url = audioInput.url?.trim() || media.url;
      media.originalName = audioInput.originalName || media.originalName;
      media.isLocalFile = audioInput.isLocalFile || media.isLocalFile;
      media.size = audioInput.size || media.size;
    }

    return this.mediaItemProcessor.upsertMediaItem(audioInput.id, media);
  }
}