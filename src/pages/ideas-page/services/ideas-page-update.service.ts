import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { DataSource, QueryRunner, In } from 'typeorm';
import { AwsS3Service } from 'src/aws/aws-s3.service';
import { RouteService } from 'src/route/route.service';
import { RouteEntity, RouteType } from 'src/route/route-page.entity';
import { IdeasPageRepository } from '../repositories/ideas-page.repository';
import { MediaItemProcessor } from 'src/share/media/media-item-processor';
import { IdeasSectionDto, UpdateIdeasPageDto } from '../dto/update-ideas-page.dto';
import { IdeasPageEntity } from '../entities/ideas-page.entity';
import { IdeasSectionEntity } from '../entities/ideas-section.entity';
import { MediaItemEntity, MediaType, UploadType } from 'src/share/media/media-item/media-item.entity';
import { MediaTargetType } from 'src/share/media/media-target-type.enum';
import { IdeasSectionRepository } from '../repositories/ideas-section.repository';
import { MediaItemDto } from 'src/share/share-dto/media-item-dto';

@Injectable()
export class IdeasPageUpdateService {
  private readonly logger = new Logger(IdeasPageUpdateService.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly s3: AwsS3Service,
    private readonly routeService: RouteService,
    private readonly mediaItemProcessor: MediaItemProcessor,
    private readonly pageRepo: IdeasPageRepository,
    private readonly sectionRepo: IdeasSectionRepository,
  ) {
  }

  async updateIdeasPage(
    id: string,
    pageData: UpdateIdeasPageDto,
    filesDict: Record<string, Express.Multer.File>,
  ): Promise<IdeasPageEntity> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const ideasPageExisting = await this.validatePage(id, queryRunner);
      const ideasSectionExisting = await this.validateSections(ideasPageExisting.id, queryRunner);
      const ideasPageRouteExisting = await this.validateRoute(ideasPageExisting.id);
      const oldMedia = await this.validateMedia(ideasSectionExisting.map(section => section.id), queryRunner);

      await this.deleteSections(ideasSectionExisting, pageData.sections, queryRunner);
      await this.deleteMedia(oldMedia, pageData.sections, queryRunner);

      const savedIdeasPage = await this.upsertIdeasPage(ideasPageExisting.id, pageData, queryRunner);
      const savedRoute = await this.upsertRoute(ideasPageRouteExisting.id, pageData, savedIdeasPage.id);

      const updatedSections: IdeasSectionEntity[] = [];
      const processedMediaIds: string[] = [];

      for (const sectionInput of pageData.sections) {
        let savedSection: IdeasSectionEntity;

        if (sectionInput.id) {
          savedSection = await this.upsertSection(sectionInput, savedIdeasPage, queryRunner);
        } else {
          savedSection = await this.addSection(sectionInput, savedIdeasPage, queryRunner);
        }
        updatedSections.push(savedSection);

        const oldSectionMedia = oldMedia.filter(m => m.targetId === savedSection.id);
        const processedMedia = await this.processSectionMedia(
          sectionInput.medias || [],
          savedSection.id,
          oldSectionMedia,
          filesDict,
          queryRunner,
        );
        processedMediaIds.push(...processedMedia.map(m => m.id));
      }

      savedIdeasPage.sections = updatedSections;
      savedIdeasPage.route = savedRoute;
      const finalIdeasPage = await queryRunner.manager.save(IdeasPageEntity, savedIdeasPage);

      for (const section of finalIdeasPage.sections) {
        const medias = await queryRunner.manager.find(MediaItemEntity, {
          where: {
            targetId: section.id,
            targetType: MediaTargetType.IdeasSection,
            id: In(processedMediaIds),
          },
        });
        (section as any).medias = medias;
      }

      await queryRunner.commitTransaction();
      return finalIdeasPage;
    } catch (error) {
      this.logger.error(`Error updating ideas page with ID: ${id}. Rolling back`, error.stack);
      await queryRunner.rollbackTransaction();
      throw new BadRequestException('Error updating ideas page. No data was saved.');
    } finally {
      await queryRunner.release();
    }
  }

  private async validatePage(id: string, queryRunner: QueryRunner): Promise<IdeasPageEntity> {
    const page = await queryRunner.manager.findOne(IdeasPageEntity, {
      where: { id },
      relations: ['route'],
    });
    if (!page) {
      throw new NotFoundException('Ideas page not found');
    }
    return page;
  }

  private async validateSections(pageId: string, queryRunner: QueryRunner): Promise<IdeasSectionEntity[]> {
    const sections = await queryRunner.manager.find(IdeasSectionEntity, {
      where: { page: { id: pageId } },
    });
    if (!sections || sections.length === 0) {
      throw new NotFoundException('Ideas page sections not found');
    }
    return sections;
  }

  private async validateRoute(entityId: string): Promise<RouteEntity> {
    const route = await this.routeService.findRouteByEntityId(entityId);
    if (!route) {
      throw new NotFoundException('Ideas page route not found');
    }
    return route;
  }

  private async validateMedia(sectionIds: string[], queryRunner: QueryRunner): Promise<MediaItemEntity[]> {
    const media = await queryRunner.manager.find(MediaItemEntity, {
      where: {
        targetId: In(sectionIds),
        targetType: MediaTargetType.IdeasSection,
      },
    });
    if (!media || media.length === 0) {
      throw new NotFoundException('Media associated with ideas page not found');
    }
    return media;
  }

  private async upsertIdeasPage(
    id: string,
    pageData: UpdateIdeasPageDto,
    queryRunner: QueryRunner,
  ): Promise<IdeasPageEntity> {
    const ideasPageToUpsert: Partial<IdeasPageEntity> = {
      id,
      title: pageData.title,
      subtitle: pageData.subtitle,
      description: pageData.description,
    };
    const savedIdeasPage = await queryRunner.manager.save(IdeasPageEntity, ideasPageToUpsert);
    return savedIdeasPage;
  }

  private async addSection(
    sectionInput: IdeasSectionDto,
    ideasPage: IdeasPageEntity,
    queryRunner: QueryRunner,
  ): Promise<IdeasSectionEntity> {
    const sectionToAdd: Partial<IdeasSectionEntity> = {
      title: sectionInput.title,
      description: sectionInput.description,
      public: sectionInput.public ?? true,
      page: ideasPage,
    };
    const savedSection = await queryRunner.manager.save(IdeasSectionEntity, sectionToAdd);
    return savedSection;
  }

  private async deleteSections(
    existingSections: IdeasSectionEntity[],
    requestedSections: IdeasSectionDto[],
    queryRunner: QueryRunner,
  ): Promise<void> {
    const sectionsToRemove = existingSections.filter(
      existing => !requestedSections.some(requested => requested.id === existing.id),
    );
    for (const section of sectionsToRemove) {
      await queryRunner.manager.remove(IdeasSectionEntity, section);
    }
  }

  private async deleteMedia(
    existingMedia: MediaItemEntity[],
    requestedSections: IdeasSectionDto[],
    queryRunner: QueryRunner,
  ): Promise<void> {
    const requestedMediaIds = requestedSections
      .flatMap(section => section.medias.map(media => media.id))
      .filter((id): id is string => typeof id === 'string' && id.length > 0);
    const mediaToRemove = existingMedia.filter(
      existing => existing.id && !requestedMediaIds.includes(existing.id),
    );
    for (const media of mediaToRemove) {
      if (!media.id) {
        continue;
      }
      if (media.isLocalFile && media.url) {
        try {
          await this.s3.delete(media.url);
        } catch (error) {
          this.logger.error(`Error deleting file from S3: ${media.url}`, error.stack);
          throw new BadRequestException(`Error deleting file from S3: ${media.url}`);
        }
      }
      await queryRunner.manager.delete(MediaItemEntity, { id: media.id });
    }
  }

  private async addMedia(
    mediaInput: MediaItemDto,
    targetId: string,
    filesDict: Record<string, Express.Multer.File>,
    queryRunner: QueryRunner,
  ): Promise<MediaItemEntity> {
    const media = this.mediaItemProcessor.buildBaseMediaItem(
      { ...mediaInput, mediaType: mediaInput.mediaType || MediaType.IMAGE },
      targetId,
      MediaTargetType.IdeasSection,
    );

    if (mediaInput.uploadType === UploadType.UPLOAD || mediaInput.isLocalFile === true) {
      media.platformType = undefined;
      if (!mediaInput.fieldKey) {
        throw new BadRequestException(`FieldKey missing for media "${mediaInput.title}"`);
      }
      const file = filesDict[mediaInput.fieldKey];
      if (!file) {
        throw new BadRequestException(`File missing for media "${mediaInput.title}"`);
      }
      media.url = await this.s3.upload(file);
      media.isLocalFile = mediaInput.isLocalFile;
      media.originalName = file.originalname;
      media.size = file.size;
    } else {
      media.title = mediaInput.title || media.title;
      media.description = mediaInput.description || media.description;
      media.uploadType = mediaInput.uploadType || media.uploadType;
      media.platformType = mediaInput.platformType || media.platformType;
      media.mediaType = mediaInput.mediaType || media.mediaType;
      media.url = mediaInput.url?.trim() || media.url;
      media.originalName = mediaInput.originalName || media.originalName;
      media.isLocalFile = mediaInput.isLocalFile || media.isLocalFile;
      media.size = mediaInput.size || media.size;
    }

    const savedMedia = await this.mediaItemProcessor.saveMediaItem(media);
    return savedMedia;
  }

  private async upsertSection(
    sectionInput: IdeasSectionDto,
    ideasPage: IdeasPageEntity,
    queryRunner: QueryRunner,
  ): Promise<IdeasSectionEntity> {
    const sectionToUpsert: Partial<IdeasSectionEntity> = {
      id: sectionInput.id,
      title: sectionInput.title,
      description: sectionInput.description,
      public: sectionInput.public ?? true,
      page: ideasPage,
    };
    const savedSection = await queryRunner.manager.save(IdeasSectionEntity, sectionToUpsert);
    return savedSection;
  }

  private async upsertMedia(
    mediaInput: MediaItemDto,
    targetId: string,
    filesDict: Record<string, Express.Multer.File>,
    queryRunner: QueryRunner,
  ): Promise<MediaItemEntity> {
    const media = this.mediaItemProcessor.buildBaseMediaItem(
      mediaInput,
      targetId,
      MediaTargetType.IdeasSection,
    );
    if (mediaInput.isLocalFile && !mediaInput.id && mediaInput.uploadType === UploadType.UPLOAD) {
      const key = mediaInput.fieldKey ?? mediaInput.url;
      if (!key) {
        throw new BadRequestException(`File missing for upload: no fieldKey or url provided`);
      }
      const file = filesDict[key];
      if (!file) {
        throw new BadRequestException(`File not found for upload: ${key}`);
      }
      media.url = await this.s3.upload(file);
      media.originalName = file.originalname;
      media.isLocalFile = mediaInput.isLocalFile;
      media.size = file.size;
    } else {
      media.title = mediaInput.title || media.title;
      media.description = mediaInput.description || media.description;
      media.uploadType = mediaInput.uploadType || media.uploadType;
      media.platformType = mediaInput.platformType || media.platformType;
      media.mediaType = mediaInput.mediaType || media.mediaType;
      media.url = mediaInput.url?.trim() || media.url;
      media.originalName = mediaInput.originalName || media.originalName;
      media.isLocalFile = mediaInput.isLocalFile || media.isLocalFile;
      media.size = mediaInput.size || media.size;
    }


    const savedMedia = await queryRunner.manager.save(MediaItemEntity, {
      ...media,
      id: mediaInput.id,
    });
    return savedMedia;
  }

  private async upsertRoute(
    routeId: string,
    pageData: UpdateIdeasPageDto,
    ideasPageId: string,
  ): Promise<RouteEntity> {
    const routeData: Partial<RouteEntity> = {
      title: pageData.title,
      subtitle: pageData.subtitle,
      description: pageData.description,
      idToFetch: ideasPageId,
      entityType: MediaTargetType.IdeasPage,
      entityId: ideasPageId,
      type: RouteType.PAGE,
      path: 'galeria_ideias_',
      image: 'https://clubinho-nib.s3.us-east-1.amazonaws.com/production/cards/card_ideias.png',
      public: false,
    };
    const savedRoute = await this.routeService.upsertRoute(routeId, routeData);
    return savedRoute;
  }

  private async processSectionMedia(
    mediaItems: MediaItemDto[],
    sectionId: string,
    oldMedia: MediaItemEntity[],
    filesDict: Record<string, Express.Multer.File>,
    queryRunner: QueryRunner,
  ): Promise<MediaItemEntity[]> {
    const processedMedia: MediaItemEntity[] = [];
    for (const mediaInput of mediaItems) {
      if (mediaInput.id) {
        const savedMedia = await this.upsertMedia(mediaInput, sectionId, filesDict, queryRunner);
        processedMedia.push(savedMedia);
      } else {
        const savedMedia = await this.addMedia(mediaInput, sectionId, filesDict, queryRunner);
        processedMedia.push(savedMedia);
      }
    }
    return processedMedia;
  }
}