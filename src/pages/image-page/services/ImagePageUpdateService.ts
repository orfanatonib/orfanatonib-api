import {
    Injectable,
    Logger,
    NotFoundException,
    BadRequestException,
} from '@nestjs/common';
import { DataSource, QueryRunner } from 'typeorm';
import { AwsS3Service } from 'src/aws/aws-s3.service';
import { RouteService } from 'src/route/route.service';
import { RouteEntity, RouteType } from 'src/route/route-page.entity';
import { ImagePageRepository } from '../repository/image-page.repository';
import { ImageSectionRepository } from '../../image-section/repository/image-section.repository';
import { MediaItemProcessor } from 'src/share/media/media-item-processor';
import { UpdateImagePageDto, UpdateSectionDto } from '../dto/update-image.dto';
import { ImagePageResponseDto } from '../dto/image-page-response.dto';
import { ImageSectionEntity } from '../entity/Image-section.entity';
import { MediaItemEntity, UploadType } from 'src/share/media/media-item/media-item.entity';
import { ImagePageEntity } from '../entity/Image-page.entity';
import { MediaItemDto } from 'src/share/share-dto/media-item-dto';
import { MediaTargetType } from 'src/share/media/media-target-type.enum';

@Injectable()
export class ImagePageUpdateService {
    private readonly logger = new Logger(ImagePageUpdateService.name);

    constructor(
        private readonly dataSource: DataSource,
        private readonly imagePageRepository: ImagePageRepository,
        private readonly imageSectionRepository: ImageSectionRepository,
        private readonly routeService: RouteService,
        private readonly awsS3Service: AwsS3Service,
        private readonly mediaItemProcessor: MediaItemProcessor,
    ) {
    }

    async updateImagePage(
        id: string,
        pageData: UpdateImagePageDto,
        filesDict: Record<string, Express.Multer.File>,
    ): Promise<ImagePageResponseDto> {
        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            const imagePageExisting = await this.validateImagePage(id);
            const imageSectionExisting = await this.validateSections(imagePageExisting.id);
            const imagePageRouteExisting = await this.validateRoute(imagePageExisting.id);
            const oldMedia = await this.validateMedia(imageSectionExisting.map(section => section.id));

            await this.deleteSections(imageSectionExisting, pageData.sections, queryRunner);
            await this.deleteMedia(oldMedia, pageData.sections, queryRunner);

            const savedImagePage = await this.upsertImagePage(imagePageExisting.id, pageData, queryRunner);
            const savedRoute = await this.upsertRoute(imagePageRouteExisting.id, pageData, savedImagePage.id);

            const updatedSections: ImageSectionEntity[] = [];
            const mediaMap = new Map<string, MediaItemEntity[]>();

            for (const sectionInput of pageData.sections) {
                let savedSection: ImageSectionEntity;

                if (sectionInput.id) {
                    savedSection = await this.upsertSection(sectionInput, savedImagePage, queryRunner);
                } else {
                    savedSection = await this.addSection(sectionInput, savedImagePage, queryRunner);
                }
                updatedSections.push(savedSection);

                const oldSectionMedia = oldMedia.filter(m => m.targetId === savedSection.id);
                const processedMedia = await this.processSectionMedia(
                    sectionInput.mediaItems,
                    savedSection.id,
                    oldSectionMedia,
                    filesDict,
                    queryRunner
                );
                mediaMap.set(savedSection.id, processedMedia);
            }

            savedImagePage.sections = updatedSections;
            savedImagePage.route = savedRoute;
            const finalImagePage = await queryRunner.manager.save(ImagePageEntity, savedImagePage);

            await queryRunner.commitTransaction();
            return ImagePageResponseDto.fromEntity(finalImagePage, mediaMap);
        } catch (error) {
            this.logger.error('Error updating gallery. Rolling back.', error);
            await queryRunner.rollbackTransaction();
            throw new BadRequestException('Error updating gallery. No data was saved.');
        } finally {
            await queryRunner.release();
        }
    }

    async validateImagePage(id: string): Promise<ImagePageEntity> {
        const imagePage = await this.imagePageRepository.findByIdWithSections(id);
        if (!imagePage) {
            throw new NotFoundException('Page not found');
        }
        return imagePage;
    }

    async validateSections(pageId: string): Promise<ImageSectionEntity[]> {
        const sections = await this.imageSectionRepository.findByPageId(pageId);
        if (!sections || sections.length === 0) {
            throw new NotFoundException('Gallery sections not found');
        }
        return sections;
    }

    async validateRoute(entityId: string): Promise<RouteEntity> {
        const route = await this.routeService.findRouteByEntityId(entityId);
        if (!route) {
            throw new NotFoundException('Gallery route not found');
        }
        return route;
    }

    async validateMedia(sectionIds: string[]): Promise<MediaItemEntity[]> {
        const media = await this.mediaItemProcessor.findManyMediaItemsByTargets(sectionIds, 'ImagesPage');
        if (!media || media.length === 0) {
            throw new NotFoundException('Media associated with gallery not found');
        }
        return media;
    }

    async upsertImagePage(
        id: string,
        pageData: UpdateImagePageDto,
        queryRunner: QueryRunner
    ): Promise<ImagePageEntity> {
        const imagePageToUpsert: Partial<ImagePageEntity> = {
            id,
            name: pageData.title,
            description: pageData.description,
            public: pageData.public,
        };
        const savedImagePage = await queryRunner.manager.save(ImagePageEntity, imagePageToUpsert);
        return savedImagePage;
    }

    async addSection(
        sectionInput: UpdateSectionDto,
        imagePage: ImagePageEntity,
        queryRunner: QueryRunner
    ): Promise<ImageSectionEntity> {
        const sectionToAdd: Partial<ImageSectionEntity> = {
            caption: sectionInput.caption,
            description: sectionInput.description,
            public: sectionInput.public,
            page: imagePage,
        };
        const savedSection = await queryRunner.manager.save(ImageSectionEntity, sectionToAdd);
        return savedSection;
    }

    async deleteSections(
        existingSections: ImageSectionEntity[],
        requestedSections: UpdateSectionDto[],
        queryRunner: QueryRunner
    ): Promise<void> {
        const sectionsToRemove = existingSections.filter(
            existing => !requestedSections.some(requested => requested.id === existing.id)
        );
        for (const section of sectionsToRemove) {
            await queryRunner.manager.remove(ImageSectionEntity, section);
        }
    }

    async deleteMedia(
        existingMedia: MediaItemEntity[],
        requestedSections: UpdateSectionDto[],
        queryRunner: QueryRunner
    ): Promise<void> {
        const requestedMediaIds = requestedSections
            .flatMap(section => section.mediaItems.map(media => media.id))
            .filter((id): id is string => typeof id === 'string' && id.length > 0);
        const mediaToRemove = existingMedia.filter(
            existing => existing.id && !requestedMediaIds.includes(existing.id)
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
            }
            await queryRunner.manager.remove(MediaItemEntity, media);
        }
    }

    async addMedia(
        mediaInput: MediaItemDto,
        targetId: string,
        filesDict: Record<string, Express.Multer.File>,
        queryRunner: QueryRunner
    ): Promise<MediaItemEntity> {
        const media = this.mediaItemProcessor.buildBaseMediaItem(mediaInput, targetId, 'ImagesPage');
        if (mediaInput.isLocalFile) {
            const key = mediaInput.fieldKey ?? mediaInput.url;
            if (!key) {
                throw new Error(`File missing for upload: no fieldKey or url provided`);
            }
            const file = filesDict[key];
            if (!file) {
                throw new Error(`File not found for upload: ${key}`);
            }

            media.url = await this.awsS3Service.upload(file);
            media.originalName = file.originalname;
            media.size = file.size;
        }
        const savedMedia = await queryRunner.manager.save(MediaItemEntity, media);
        return savedMedia;
    }

    async upsertSection(
        sectionInput: UpdateSectionDto,
        imagePage: ImagePageEntity,
        queryRunner: QueryRunner
    ): Promise<ImageSectionEntity> {
        const sectionToUpsert: Partial<ImageSectionEntity> = {
            id: sectionInput.id,
            caption: sectionInput.caption,
            description: sectionInput.description,
            public: sectionInput.public,
            page: imagePage,
        };
        const savedSection = await queryRunner.manager.save(ImageSectionEntity, sectionToUpsert);
        return savedSection;
    }

    async upsertMedia(
        mediaInput: MediaItemDto,
        targetId: string,
        filesDict: Record<string, Express.Multer.File>,
        queryRunner: QueryRunner
    ): Promise<MediaItemEntity> {
        const media = this.mediaItemProcessor.buildBaseMediaItem(mediaInput, targetId, 'ImagesPage');

        if (mediaInput.isLocalFile && !mediaInput.id && mediaInput.uploadType === UploadType.UPLOAD) {
            const key = mediaInput.fieldKey ?? mediaInput.url;
            if (!key) {
                throw new Error(`File missing for upload: no fieldKey or url provided`);
            }
            const file = filesDict[key];
            if (!file) {
                throw new Error(`File not found for upload: ${key}`);
            }

            media.url = await this.awsS3Service.upload(file);
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

        const savedMedia = await queryRunner.manager.save(MediaItemEntity, { ...media, id: mediaInput.id });
        return savedMedia;
    }

    async upsertRoute(
        routeId: string,
        pageData: UpdateImagePageDto,
        imagePageId: string
    ): Promise<RouteEntity> {
        const routeData: Partial<RouteEntity> = {
            title: pageData.title,
            subtitle: 'Image gallery page',
            idToFetch: imagePageId,
            entityType: MediaTargetType.ImagesPage,
            entityId: imagePageId,
            type: RouteType.PAGE,
            description: pageData.description,
            path: 'galeria_imagens_',
            image: 'https://clubinho-nib.s3.us-east-1.amazonaws.com/production/cards/card_imagens.png',
            public: pageData.public
        };

        const savedRoute = await this.routeService.upsertRoute(routeId, routeData);
        return savedRoute;
    }

    async processSectionMedia(
        mediaItems: MediaItemDto[],
        sectionId: string,
        oldMedia: MediaItemEntity[],
        filesDict: Record<string, Express.Multer.File>,
        queryRunner: QueryRunner
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
