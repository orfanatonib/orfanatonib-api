import { Injectable, Logger } from '@nestjs/common';
import { IntegrationRepository } from './integration.repository';
import { CreateIntegrationDto } from './dto/create-integration.dto';
import { UpdateIntegrationDto } from './dto/update-integration.dto';
import { IntegrationResponseDto, PaginatedResponseDto } from './dto/integration-response.dto';
import { QueryIntegrationDto } from './dto/query-integration.dto';
import { MediaItemProcessor } from 'src/shared/media/media-item-processor';
import { MediaTargetType } from 'src/shared/media/media-target-type.enum';
import { MediaType, UploadType, MediaItemEntity } from 'src/shared/media/media-item/media-item.entity';
import { AwsS3Service } from 'src/infrastructure/aws/aws-s3.service';
import { UpdateIntegrationService } from './services/update-integration.service';
import { DeleteIntegrationService } from './services/delete-integration.service';

@Injectable()
export class IntegrationService {
    private readonly logger = new Logger(IntegrationService.name);

    constructor(
        private readonly repository: IntegrationRepository,
        private readonly mediaProcessor: MediaItemProcessor,
        private readonly s3Service: AwsS3Service,
        private readonly updateService: UpdateIntegrationService,
        private readonly deleteService: DeleteIntegrationService,
    ) { }

    async create(
        dto: CreateIntegrationDto,
        file?: Express.Multer.File,
    ): Promise<IntegrationResponseDto> {
        const integration = await this.repository.create({
            name: dto.name,
            phone: dto.phone,
            gaLeader: dto.gaLeader,
            baptized: dto.baptized,
            churchYears: dto.churchYears,
            previousMinistry: dto.previousMinistry,
            integrationYear: dto.integrationYear,
        });

        let media: MediaItemEntity | undefined;
        if (dto.media || file) {
            let mediaUrl = dto.media?.url?.trim() || '';
            let originalName: string | undefined;
            let size: number | undefined;

            if (file) {
                mediaUrl = await this.s3Service.upload(file);
                originalName = file.originalname;
                size = file.size;
            }

            const mediaEntity = this.mediaProcessor.buildBaseMediaItem(
                {
                    title: dto.media?.title || dto.name || 'Integration image',
                    description: dto.media?.description || '',
                    mediaType: MediaType.IMAGE,
                    uploadType: file ? UploadType.UPLOAD : UploadType.LINK,
                    url: mediaUrl,
                    isLocalFile: !!file,
                    originalName,
                    size,
                },
                integration.id,
                MediaTargetType.Integration,
            );

            media = await this.mediaProcessor.saveMediaItem(mediaEntity);
        }

        return IntegrationResponseDto.fromEntity(integration, media);
    }

    async findAll(): Promise<IntegrationResponseDto[]> {
        const integrations = await this.repository.findAll();

        const ids = integrations.map((i) => i.id);
        const mediaItems = await this.mediaProcessor.findManyMediaItemsByTargets(
            ids,
            MediaTargetType.Integration,
        );

        const mediaMap = new Map();
        mediaItems.forEach((item) => {
            mediaMap.set(item.targetId, item);
        });

        return integrations.map((integration) => {
            const media = mediaMap.get(integration.id) || null;
            return IntegrationResponseDto.fromEntity(integration, media);
        });
    }

    async findAllPaginated(
        query: QueryIntegrationDto,
    ): Promise<PaginatedResponseDto<IntegrationResponseDto>> {
        const { data: integrations, total } = await this.repository.findAllPaginated(query);

        const ids = integrations.map((i) => i.id);
        const mediaItems = await this.mediaProcessor.findManyMediaItemsByTargets(
            ids,
            MediaTargetType.Integration,
        );

        const mediaMap = new Map();
        mediaItems.forEach((item) => {
            mediaMap.set(item.targetId, item);
        });

        const responseData = integrations.map((integration) => {
            const media = mediaMap.get(integration.id) || null;
            return IntegrationResponseDto.fromEntity(integration, media);
        });

        return new PaginatedResponseDto(
            responseData,
            total,
            query.page || 1,
            query.limit || 10,
        );
    }

    async findOne(id: string): Promise<IntegrationResponseDto> {
        const integration = await this.repository.findById(id);
        if (!integration) {
            throw new Error(`Integration with ID ${id} not found`);
        }

        const media = await this.mediaProcessor.findMediaItemByTarget(
            id,
            MediaTargetType.Integration,
        );

        return IntegrationResponseDto.fromEntity(integration, media);
    }

    async update(
        id: string,
        dto: UpdateIntegrationDto,
        file?: Express.Multer.File,
    ): Promise<IntegrationResponseDto> {
        return this.updateService.execute(id, dto, file);
    }

    async remove(id: string): Promise<void> {
        return this.deleteService.execute(id);
    }
}
