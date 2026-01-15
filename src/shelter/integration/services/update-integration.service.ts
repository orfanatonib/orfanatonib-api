import { Injectable, Logger, NotFoundException, InternalServerErrorException } from '@nestjs/common';
import { IntegrationRepository } from '../integration.repository';
import { UpdateIntegrationDto } from '../dto/update-integration.dto';
import { IntegrationResponseDto } from '../dto/integration-response.dto';
import { MediaItemProcessor } from 'src/shared/media/media-item-processor';
import { MediaTargetType } from 'src/shared/media/media-target-type.enum';
import { MediaType, UploadType } from 'src/shared/media/media-item/media-item.entity';
import { AwsS3Service } from 'src/infrastructure/aws/aws-s3.service';

@Injectable()
export class UpdateIntegrationService {
    private readonly logger = new Logger(UpdateIntegrationService.name);

    constructor(
        private readonly repository: IntegrationRepository,
        private readonly mediaProcessor: MediaItemProcessor,
        private readonly s3Service: AwsS3Service,
    ) { }

    async execute(
        id: string,
        dto: UpdateIntegrationDto,
        file?: Express.Multer.File,
    ): Promise<IntegrationResponseDto> {
        const integration = await this.repository.findById(id);
        if (!integration) {
            throw new NotFoundException(`Integration with ID ${id} not found`);
        }

        try {
            // Atualizar dados da integração
            const updateData: Partial<typeof integration> = {};
            if (dto.name !== undefined) updateData.name = dto.name;
            if (dto.phone !== undefined) updateData.phone = dto.phone;
            if (dto.gaLeader !== undefined) updateData.gaLeader = dto.gaLeader;
            if (dto.baptized !== undefined) updateData.baptized = dto.baptized;
            if (dto.churchYears !== undefined) updateData.churchYears = dto.churchYears;
            if (dto.previousMinistry !== undefined) updateData.previousMinistry = dto.previousMinistry;
            if (dto.integrationYear !== undefined) updateData.integrationYear = dto.integrationYear;

            const updated = await this.repository.update(id, updateData);

            // Atualizar mídia se necessário
            if (dto.media || file) {
                await this.updateIntegrationMedia(id, dto.media, file);
            }

            // Buscar mídia atualizada
            const media = await this.mediaProcessor.findMediaItemByTarget(
                id,
                MediaTargetType.Integration,
            );

            return IntegrationResponseDto.fromEntity(updated!, media);
        } catch (error) {
            if (error instanceof NotFoundException) {
                throw error;
            }
            this.logger.error(`Error updating integration ${id}`, error.stack);
            throw new InternalServerErrorException('Error updating integration');
        }
    }

    private async updateIntegrationMedia(
        integrationId: string,
        mediaInput: any,
        file?: Express.Multer.File,
    ): Promise<void> {
        try {
            const existingMedia = await this.mediaProcessor.findMediaItemByTarget(
                integrationId,
                MediaTargetType.Integration,
            );

            // Se há um arquivo para upload
            if (file) {
                // Deletar arquivo antigo do S3 se existir
                if (existingMedia?.isLocalFile && existingMedia.url) {
                    try {
                        await this.s3Service.delete(existingMedia.url);
                        this.logger.log(`Deleted old file from S3: ${existingMedia.url}`);
                    } catch (error) {
                        this.logger.warn(`Could not delete old file: ${existingMedia.url}`, error);
                    }
                }

                // Upload do novo arquivo
                const fileUrl = await this.s3Service.upload(file);
                const media = this.mediaProcessor.buildBaseMediaItem(
                    {
                        title: mediaInput?.title || 'Integration image',
                        description: mediaInput?.description || '',
                        mediaType: MediaType.IMAGE,
                        uploadType: UploadType.UPLOAD,
                        url: fileUrl,
                        isLocalFile: true,
                        originalName: file.originalname,
                        size: file.size,
                    },
                    integrationId,
                    MediaTargetType.Integration,
                );

                if (existingMedia) {
                    await this.mediaProcessor.upsertMediaItem(existingMedia.id, media);
                } else {
                    await this.mediaProcessor.saveMediaItem(media);
                }
            }
            // Se há uma URL de link (não é upload)
            else if (mediaInput?.url && !mediaInput.isLocalFile) {
                const media = this.mediaProcessor.buildBaseMediaItem(
                    {
                        title: mediaInput.title || 'Integration image',
                        description: mediaInput.description || '',
                        mediaType: MediaType.IMAGE,
                        uploadType: UploadType.LINK,
                        url: mediaInput.url,
                        isLocalFile: false,
                    },
                    integrationId,
                    MediaTargetType.Integration,
                );

                if (existingMedia) {
                    await this.mediaProcessor.upsertMediaItem(existingMedia.id, media);
                } else {
                    await this.mediaProcessor.saveMediaItem(media);
                }
            }
        } catch (error) {
            this.logger.error(`Error updating integration media`, error.stack);
            throw new InternalServerErrorException('Error updating integration media');
        }
    }
}
