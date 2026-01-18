import { Injectable, Logger, NotFoundException, InternalServerErrorException, BadRequestException } from '@nestjs/common';
import { IntegrationRepository } from '../integration.repository';
import { UpdateIntegrationDto, MediaItemDto } from '../dto/update-integration.dto';
import { IntegrationResponseDto } from '../dto/integration-response.dto';
import { MediaItemProcessor } from 'src/shared/media/media-item-processor';
import { MediaTargetType } from 'src/shared/media/media-target-type.enum';
import { MediaType, UploadType, MediaItemEntity } from 'src/shared/media/media-item/media-item.entity';
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
        files?: Express.Multer.File[],
    ): Promise<IntegrationResponseDto> {
        const integration = await this.repository.findById(id);
        if (!integration) {
            throw new NotFoundException(`Integration with ID ${id} not found`);
        }

        try {
            const updateData: Partial<typeof integration> = {};
            if (dto.name !== undefined) updateData.name = dto.name;
            if (dto.phone !== undefined) updateData.phone = dto.phone;
            if (dto.gaLeader !== undefined) updateData.gaLeader = dto.gaLeader;
            if (dto.baptized !== undefined) updateData.baptized = dto.baptized;
            if (dto.churchYears !== undefined) updateData.churchYears = dto.churchYears;
            if (dto.previousMinistry !== undefined) updateData.previousMinistry = dto.previousMinistry;
            if (dto.integrationYear !== undefined) updateData.integrationYear = dto.integrationYear;

            const updated = await this.repository.update(id, updateData);

            if (dto.images || (files && files.length > 0)) {
                await this.processImages(id, dto.images, files);
            }

            const mediaItems = await this.mediaProcessor.findMediaItemsByTarget(
                id,
                MediaTargetType.Integration,
            );

            return IntegrationResponseDto.fromEntity(updated!, mediaItems);
        } catch (error) {
            if (error instanceof NotFoundException || error instanceof BadRequestException) {
                throw error;
            }
            throw new InternalServerErrorException('Error updating integration');
        }
    }

    private async processImages(
        integrationId: string,
        imagesInput?: MediaItemDto[],
        files?: Express.Multer.File[],
    ): Promise<void> {
        const existingImages = await this.mediaProcessor.findMediaItemsByTarget(
            integrationId,
            MediaTargetType.Integration,
        );

        if (!imagesInput || imagesInput.length === 0) {
            return;
        }

        const filesDict: Record<string, Express.Multer.File> = {};
        if (files) {
            files.forEach((file, index) => {
                filesDict[file.fieldname] = file;
                filesDict[`files[${index}]`] = file;
            });
        }

        const imagesToUpdate = imagesInput.filter(img => img.id);
        const imagesToCreate = imagesInput.filter(img => !img.id);
        const processedIds: string[] = [];

        for (const imageInput of imagesToUpdate) {
            const result = await this.updateExistingImage(imageInput, existingImages, filesDict);
            processedIds.push(result.id);
        }

        for (const imageInput of imagesToCreate) {
            const result = await this.createNewImage(imageInput, integrationId, filesDict);
            processedIds.push(result.id);
        }

        const idsToKeep = new Set(processedIds);
        const imagesToDelete = existingImages.filter(img => !idsToKeep.has(img.id));

        for (const imageToDelete of imagesToDelete) {
            await this.deleteImage(imageToDelete);
        }
    }

    private async updateExistingImage(
        imageInput: MediaItemDto,
        existingImages: MediaItemEntity[],
        filesDict: Record<string, Express.Multer.File>,
    ): Promise<MediaItemEntity> {
        const existingImage = existingImages.find(img => img.id === imageInput.id);
        if (!existingImage) {
            throw new NotFoundException(`Integration image with id=${imageInput.id} not found`);
        }

        const fieldKey = imageInput.fieldKey;
        const hasNewFile = fieldKey && filesDict[fieldKey];

        const updatedData: Partial<MediaItemEntity> = {
            title: imageInput.title ?? existingImage.title,
            description: imageInput.description ?? existingImage.description,
        };

        if (hasNewFile) {
            const file = filesDict[fieldKey];

            if (existingImage.isLocalFile && existingImage.url) {
                try {
                    await this.s3Service.delete(existingImage.url);
                } catch (error) {
                    this.logger.warn(`Failed to delete old S3 file: ${existingImage.url}`, error);
                }
            }

            updatedData.url = await this.s3Service.upload(file);
            updatedData.originalName = file.originalname;
            updatedData.size = file.size;
            updatedData.isLocalFile = true;
            updatedData.uploadType = UploadType.UPLOAD;
            updatedData.mediaType = MediaType.IMAGE;
        }

        return await this.mediaProcessor.upsertMediaItem(existingImage.id, {
            ...existingImage,
            ...updatedData,
        });
    }

    private async createNewImage(
        imageInput: MediaItemDto,
        integrationId: string,
        filesDict: Record<string, Express.Multer.File>,
    ): Promise<MediaItemEntity> {
        const fieldKey = imageInput.fieldKey;

        if (!fieldKey) {
            throw new BadRequestException(`New image must have a fieldKey`);
        }

        const file = filesDict[fieldKey];
        if (!file) {
            throw new BadRequestException(`File not found for fieldKey: ${fieldKey}`);
        }

        const url = await this.s3Service.upload(file);

        const media = this.mediaProcessor.buildBaseMediaItem(
            {
                title: imageInput.title,
                description: imageInput.description,
                mediaType: MediaType.IMAGE,
                uploadType: UploadType.UPLOAD,
            },
            integrationId,
            MediaTargetType.Integration,
        );

        media.url = url;
        media.originalName = file.originalname;
        media.size = file.size;
        media.isLocalFile = true;

        return await this.mediaProcessor.saveMediaItem(media);
    }

    private async deleteImage(image: MediaItemEntity): Promise<void> {
        if (image.isLocalFile && image.url) {
            try {
                await this.s3Service.delete(image.url);
            } catch (error) {
                this.logger.warn(`Failed to delete S3 file: ${image.url}`, error);
            }
        }

        await this.mediaProcessor.removeMediaItem(image);
    }
}
