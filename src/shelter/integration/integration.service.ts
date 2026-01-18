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
        files?: Express.Multer.File[],
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

        let media: MediaItemEntity[] = [];

        if (dto.images && dto.images.length > 0) {
            const uploadedFiles: { [key: string]: string } = {};

            for (let i = 0; i < dto.images.length; i++) {
                const imageDto = dto.images[i];
                let mediaUrl = imageDto.url?.trim() || '';
                let uploadType = UploadType.LINK;
                let isLocalFile = imageDto.isLocalFile || false;
                let originalName: string | undefined;
                let size: number | undefined;

                // Se temos arquivos e esta imagem não tem URL, usar o arquivo correspondente
                if (files && files.length > 0 && !mediaUrl) {
                    const fileIndex = Math.min(i, files.length - 1); // Usar arquivo correspondente ou último
                    const file = files[fileIndex];

                    // Upload apenas uma vez por arquivo
                    if (!uploadedFiles[file.originalname]) {
                        uploadedFiles[file.originalname] = await this.s3Service.upload(file);
                    }

                    mediaUrl = uploadedFiles[file.originalname];
                    uploadType = UploadType.UPLOAD;
                    isLocalFile = true;
                    originalName = file.originalname;
                    size = file.size;
                }

                if (mediaUrl) {
                    const mediaEntity = this.mediaProcessor.buildBaseMediaItem(
                        {
                            title: imageDto.title || dto.name || 'Integration image',
                            description: imageDto.description || '',
                            mediaType: MediaType.IMAGE,
                            uploadType,
                            url: mediaUrl,
                            isLocalFile,
                            originalName,
                            size,
                        },
                        integration.id,
                        MediaTargetType.Integration,
                    );

                    const savedMedia = await this.mediaProcessor.saveMediaItem(mediaEntity);
                    media.push(savedMedia);
                }
            }
        }
        // Backward compatibility: handle single/multiple files upload without dto.images
        else if (files && files.length > 0) {
            for (const file of files) {
                const mediaUrl = await this.s3Service.upload(file);
                const mediaEntity = this.mediaProcessor.buildBaseMediaItem(
                    {
                        title: dto.name || 'Integration image',
                        description: '',
                        mediaType: MediaType.IMAGE,
                        uploadType: UploadType.UPLOAD,
                        url: mediaUrl,
                        isLocalFile: true,
                        originalName: file.originalname,
                        size: file.size,
                    },
                    integration.id,
                    MediaTargetType.Integration,
                );

                const savedMedia = await this.mediaProcessor.saveMediaItem(mediaEntity);
                media.push(savedMedia);
            }
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

        const mediaMap = new Map<string, MediaItemEntity[]>();
        mediaItems.forEach((item) => {
            if (!mediaMap.has(item.targetId)) {
                mediaMap.set(item.targetId, []);
            }
            mediaMap.get(item.targetId)!.push(item);
        });

        return integrations.map((integration) => {
            const media = mediaMap.get(integration.id) || [];
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

        const mediaMap = new Map<string, MediaItemEntity[]>();
        mediaItems.forEach((item) => {
            if (!mediaMap.has(item.targetId)) {
                mediaMap.set(item.targetId, []);
            }
            mediaMap.get(item.targetId)!.push(item);
        });

        const responseData = integrations.map((integration) => {
            const media = mediaMap.get(integration.id) || [];
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

        const mediaItems = await this.mediaProcessor.findMediaItemsByTarget(
            id,
            MediaTargetType.Integration,
        );

        return IntegrationResponseDto.fromEntity(integration, mediaItems);
    }

    async update(
        id: string,
        dto: UpdateIntegrationDto,
        files?: Express.Multer.File[],
    ): Promise<IntegrationResponseDto> {
        return this.updateService.execute(id, dto, files);
    }

    async remove(id: string): Promise<void> {
        return this.deleteService.execute(id);
    }
}
