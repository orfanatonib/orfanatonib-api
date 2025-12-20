import {
    Injectable,
    Logger,
    BadRequestException,
} from '@nestjs/common';
import { DataSource, QueryRunner } from 'typeorm';
import { AwsS3Service } from 'src/aws/aws-s3.service';
import { RouteService } from 'src/route/route.service';
import { RouteEntity, RouteType } from 'src/route/route-page.entity';
import { MediaItemProcessor } from 'src/share/media/media-item-processor';
import { MediaItemEntity, UploadType } from 'src/share/media/media-item/media-item.entity';
import { MediaTargetType } from 'src/share/media/media-target-type.enum';
import { ImagePageRepository } from '../repository/image-page.repository';
import { CreateImagePageDto } from '../dto/create-image.dto';
import { ImagePageResponseDto } from '../dto/image-page-response.dto';
import { ImagePageEntity } from '../entity/Image-page.entity';
import { ImageSectionEntity } from '../entity/Image-section.entity';

@Injectable()
export class ImagePageCreateService {
    private readonly logger = new Logger(ImagePageCreateService.name);

    constructor(
        private readonly dataSource: DataSource,
        private readonly routeService: RouteService,
        private readonly awsS3Service: AwsS3Service,
        private readonly mediaItemProcessor: MediaItemProcessor,
    ) {
    }

    async createImagePage(
        pageData: CreateImagePageDto,
        filesDict: Record<string, Express.Multer.File>,
    ): Promise<ImagePageResponseDto> {
        const { title, description, public: isPublic, sections } = pageData;

        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            const gallery = queryRunner.manager.create(ImagePageEntity, {
                name: title,
                description,
                public: isPublic,
            });
            const savedGallery = await queryRunner.manager.save(gallery);

            const path = await this.routeService.generateAvailablePath(title, 'galeria_imagens_');
            const route = await this.routeService.createRouteWithManager(queryRunner.manager, {
                title,
                subtitle: 'Página de galeria de imagens',
                idToFetch: savedGallery.id,
                path,
                entityType: MediaTargetType.ImagesPage,
                description,
                entityId: savedGallery.id,
                type: RouteType.PAGE,
                image: 'https://clubinho-nib.s3.us-east-1.amazonaws.com/production/cards/card_imagens.png',
                public: isPublic,
            });

            savedGallery.route = route;
            await queryRunner.manager.save(savedGallery);

            const mediaMap = new Map<string, MediaItemEntity[]>();
            const sectionList: ImageSectionEntity[] = [];

            for (const sectionInput of sections) {
                const section = queryRunner.manager.create(ImageSectionEntity, {
                    caption: sectionInput.caption,
                    description: sectionInput.description,
                    public: sectionInput.public,
                    page: savedGallery,
                });

                const savedSection = await queryRunner.manager.save(section);
                sectionList.push(savedSection);

                const mediaItemsPrepared = sectionInput.mediaItems.map((item) => {
                    if (item.uploadType === UploadType.UPLOAD && item.isLocalFile) {
                        if (!item.originalName) {
                            throw new Error('originalName field missing in upload item.');
                        }
                        if (!item.fieldKey || !filesDict[item.fieldKey]) {
                            throw new Error(`File not found for fieldKey: ${item.fieldKey}`);
                        }
                    }
                    return {
                        ...item,
                        fileField: item.fieldKey,
                    };
                });

                const mediaItems = await this.mediaItemProcessor.processMediaItemsPolymorphic(
                    mediaItemsPrepared,
                    savedSection.id,
                    MediaTargetType.ImagesPage,
                    filesDict,
                    this.awsS3Service.upload.bind(this.awsS3Service),
                );
                mediaMap.set(savedSection.id, mediaItems);
            }

            savedGallery.sections = sectionList;
            const finalGallery = await queryRunner.manager.save(savedGallery);

            await queryRunner.commitTransaction();
            return ImagePageResponseDto.fromEntity(finalGallery, mediaMap);
        } catch (error) {
            this.logger.error('Error creating gallery. Rolling back.', error);
            await queryRunner.rollbackTransaction();
            throw new BadRequestException('Erro ao criar a galeria. Nenhum dado foi salvo.');
        } finally {
            await queryRunner.release();
        }
    }
}