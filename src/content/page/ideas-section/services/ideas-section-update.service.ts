import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { DataSource, QueryRunner } from 'typeorm';
import { AwsS3Service } from 'src/infrastructure/aws/aws-s3.service';
import { MediaItemProcessor } from 'src/shared/media/media-item-processor';
import { UploadType } from 'src/shared/media/media-item/media-item.entity';
import { IdeasSectionMediaType } from '../enums/ideas-section-media-type.enum';
import { MediaTargetType } from 'src/shared/media/media-target-type.enum';
import { IdeasSectionRepository } from '../repository/ideas-section.repository';
import { UpdateIdeasSectionDto } from '../dto/update-ideas-section.dto';
import { IdeasSectionMediaItemDto } from '../dto/ideas-section-media-item.dto';
import { MediaItemEntity } from 'src/shared/media/media-item/media-item.entity';
import { IdeasSectionResponseDto } from '../dto/ideas-section-response.dto';
import { IdeasSectionEntity } from 'src/content/page/ideas-section/entites/ideas-section.entity';
import { IdeasPageEntity } from 'src/content/page/ideas-page/entities/ideas-page.entity';

@Injectable()
export class IdeasSectionUpdateService {
  private readonly logger = new Logger(IdeasSectionUpdateService.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly awsS3Service: AwsS3Service,
    private readonly mediaItemProcessor: MediaItemProcessor,
    private readonly ideasSectionRepository: IdeasSectionRepository,
  ) { }

  async updateSection(
    id: string,
    dto: UpdateIdeasSectionDto,
    filesDict: Record<string, Express.Multer.File>,
  ): Promise<IdeasSectionResponseDto> {

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const existingSection = await this.validateSection(id, queryRunner);

      const existingMedia = await this.validateMedia([id], queryRunner);
      const savedSection = await this.upsertSection(dto, existingSection.page, queryRunner);
      const normalized = (dto.medias || []).map((item) => ({
        ...item,
        mediaType:
          item.mediaType === IdeasSectionMediaType.VIDEO ? 'video' :
            item.mediaType === IdeasSectionMediaType.DOCUMENT ? 'document' :
              'image',
        uploadType: item.uploadType,
        fileField:
          item.uploadType === 'upload' && item.isLocalFile
            ? item.fieldKey
            : undefined,
      }));

      const processedMedia = await this.processSectionMedia(
        dto.medias || [],
        savedSection.id,
        existingMedia,
        filesDict,
        queryRunner,
      );

      await queryRunner.commitTransaction();

      return IdeasSectionResponseDto.fromEntity(savedSection, processedMedia);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error('Error updating section', error);

      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }

      throw new BadRequestException('Error updating ideas section');
    } finally {
      await queryRunner.release();
    }
  }

  async editAndAttachSectionToPage(
    sectionId: string,
    pageId: string,
    dto: UpdateIdeasSectionDto,
    filesDict: Record<string, Express.Multer.File>,
  ): Promise<IdeasSectionResponseDto> {

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const existingSection = await queryRunner.manager.findOne(IdeasSectionEntity, {
        where: { id: sectionId },
      });

      if (!existingSection) {
        throw new NotFoundException(`Seção de ideias com ID=${sectionId} não encontrada`);
      }
      if (existingSection.page) {
        throw new BadRequestException(
          `Seção ID=${sectionId} já está vinculada à página ID=${existingSection.page.id}`
        );
      }

      const ideasPage = await queryRunner.manager.findOne(IdeasPageEntity, {
        where: { id: pageId },
      });

      if (!ideasPage) {
        throw new NotFoundException(`Página de ideias com ID=${pageId} não encontrada`);
      }

      const existingMedia = await queryRunner.manager.find(MediaItemEntity, {
        where: {
          targetId: sectionId,
          targetType: MediaTargetType.IdeasSection,
        },
      });

      this.validateFiles(dto, filesDict);

      const updatedSection = queryRunner.manager.merge(IdeasSectionEntity, existingSection, {
        title: dto.title,
        description: dto.description,
        public: dto.public,
        page: ideasPage,
      });

      const savedSection = await queryRunner.manager.save(updatedSection);

      const normalized = dto.medias.map((item) => ({
        ...item,
        mediaType:
          item.mediaType === IdeasSectionMediaType.VIDEO ? 'video' :
            item.mediaType === IdeasSectionMediaType.DOCUMENT ? 'document' :
              'image',
        uploadType: item.uploadType,
        fileField:
          item.uploadType === 'upload' && item.isLocalFile
            ? item.fieldKey
            : undefined,
      }));


      await this.deleteMedia(existingMedia, dto.medias, queryRunner);

      const processedMedia = await this.processSectionMedia(
        dto.medias || [],
        savedSection.id,
        existingMedia,
        filesDict,
        queryRunner,
      );

      ideasPage.sections = [...(ideasPage.sections || []), savedSection];
      await queryRunner.manager.save(IdeasPageEntity, ideasPage);

      await queryRunner.commitTransaction();

      return IdeasSectionResponseDto.fromEntity(savedSection, processedMedia);

    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error('Error editing and linking section', error);

      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }

      throw new BadRequestException('Error editing and linking ideas section');
    } finally {
      await queryRunner.release();
    }
  }

  private async validateSection(id: string, queryRunner: any): Promise<IdeasSectionEntity> {
    const section = await queryRunner.manager.findOne(IdeasSectionEntity, {
      where: { id },
      relations: ['page'],
    });
    if (!section) {
      this.logger.warn(`Section with ID ${id} not found`);
      throw new NotFoundException('Ideas section not found');
    }
    return section;
  }

  private async validateMedia(sectionIds: string[], queryRunner: any): Promise<MediaItemEntity[]> {
    const media = await queryRunner.manager.find(MediaItemEntity, {
      where: {
        targetId: sectionIds[0],
        targetType: MediaTargetType.IdeasSection,
      },
    });
    return media;
  }

  private async upsertSection(
    sectionInput: UpdateIdeasSectionDto,
    page: IdeasPageEntity | null,
    queryRunner: any,
  ): Promise<IdeasSectionEntity> {
    const sectionToUpsert: Partial<IdeasSectionEntity> = {
      title: sectionInput.title,
      description: sectionInput.description,
      public: sectionInput.public ?? true,
      page: page || undefined,
    };
    const savedSection = await queryRunner.manager.save(IdeasSectionEntity, sectionToUpsert);
    return savedSection;
  }



  private validateFiles(dto: UpdateIdeasSectionDto, filesDict: Record<string, Express.Multer.File>) {
    for (const media of dto.medias) {
      if (media.uploadType === UploadType.UPLOAD && media.isLocalFile && (!media.id || media.fieldKey)) {
        if (!media.originalName) {
          throw new BadRequestException('Campo originalName ausente');
        }
        if (media.fieldKey && !filesDict[media.fieldKey]) {
          throw new BadRequestException(`Arquivo não encontrado para fieldKey: ${media.fieldKey}`);
        }
      }
    }
  }

  private async deleteMedia(
    existingMedia: MediaItemEntity[],
    requestedMedias: IdeasSectionMediaItemDto[],
    queryRunner: QueryRunner,
  ): Promise<void> {
    const requestedMediaIds = requestedMedias
      .map(media => media.id)
      .filter((id): id is string => typeof id === 'string' && id.length > 0);

    const mediaToRemove = existingMedia.filter(
      existing => existing.id && !requestedMediaIds.includes(existing.id),
    );

    for (const media of mediaToRemove) {
      if (!media.id) {
        this.logger.warn(`Media without ID detected, skipping deletion: URL=${media.url || 'unknown'}`);
        continue;
      }

      if (media.isLocalFile && media.url) {
        try {
          await this.awsS3Service.delete(media.url);
        } catch (error) {
          this.logger.error(`Error deleting file from S3: ${media.url}`, error.stack);
          throw new BadRequestException(`Error deleting file from S3: ${media.url}`);
        }
      }

      await queryRunner.manager.delete(MediaItemEntity, { id: media.id });
    }
  }

  private async processSectionMedia(
    mediaItems: IdeasSectionMediaItemDto[],
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

  private async addMedia(
    mediaInput: IdeasSectionMediaItemDto,
    targetId: string,
    filesDict: Record<string, Express.Multer.File>,
    queryRunner: QueryRunner,
  ): Promise<MediaItemEntity> {

    const media = this.mediaItemProcessor.buildBaseMediaItem(
      { ...mediaInput, mediaType: mediaInput.mediaType as any || IdeasSectionMediaType.IMAGE },
      targetId,
      MediaTargetType.IdeasSection,
    );

    if (mediaInput.uploadType === UploadType.UPLOAD || mediaInput.isLocalFile === true) {
      media.platformType = undefined;
      if (!mediaInput.fieldKey) {
        this.logger.error(`FieldKey missing for media "${mediaInput.title}"`);
        throw new BadRequestException(`FieldKey ausente para mídia "${mediaInput.title}"`);
      }
      const file = filesDict[mediaInput.fieldKey];
      if (!file) {
        this.logger.error(`File missing for media "${mediaInput.title}" (fieldKey: ${mediaInput.fieldKey})`);
        throw new BadRequestException(`Arquivo ausente para mídia "${mediaInput.title}"`);
      }
      media.url = await this.awsS3Service.upload(file);
      media.isLocalFile = mediaInput.isLocalFile;
      media.originalName = file.originalname;
      media.size = file.size;
    } else {
      media.title = mediaInput.title || media.title;
      media.description = mediaInput.description || media.description;
      media.uploadType = mediaInput.uploadType || media.uploadType;
      media.platformType = mediaInput.platformType || media.platformType;
      media.mediaType = (mediaInput.mediaType as any) || media.mediaType;
      media.url = mediaInput.url?.trim() || media.url;
      media.originalName = mediaInput.originalName || media.originalName;
      media.isLocalFile = mediaInput.isLocalFile || media.isLocalFile;
      media.size = mediaInput.size || media.size;
    }

    const savedMedia = await this.mediaItemProcessor.saveMediaItem(media);
    return savedMedia;
  }

  private async upsertMedia(
    mediaInput: IdeasSectionMediaItemDto,
    targetId: string,
    filesDict: Record<string, Express.Multer.File>,
    queryRunner: QueryRunner,
  ): Promise<MediaItemEntity> {
    const media = this.mediaItemProcessor.buildBaseMediaItem(
      { ...mediaInput, mediaType: mediaInput.mediaType as any },
      targetId,
      MediaTargetType.IdeasSection,
    );

    if (mediaInput.isLocalFile && !mediaInput.id && mediaInput.uploadType === UploadType.UPLOAD) {
      const key = mediaInput.fieldKey ?? mediaInput.url;
      if (!key) {
        this.logger.error(`File missing for upload: no fieldKey or url provided`);
        throw new BadRequestException(`File missing for upload: no fieldKey or url provided`);
      }
      const file = filesDict[key];
      if (!file) {
        this.logger.error(`File not found for key: ${key}`);
        throw new BadRequestException(`File not found for upload: ${key}`);
      }
      media.url = await this.awsS3Service.upload(file);
      media.originalName = file.originalname;
      media.isLocalFile = mediaInput.isLocalFile;
      media.size = file.size;
    } else {
      media.title = mediaInput.title || media.title;
      media.description = mediaInput.description || media.description;
      media.uploadType = mediaInput.uploadType || media.uploadType;
      media.platformType = mediaInput.platformType || media.platformType;
      media.mediaType = (mediaInput.mediaType as any) || media.mediaType;
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
}