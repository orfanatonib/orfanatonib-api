import {
  Injectable,
  Logger,
  NotFoundException,
  InternalServerErrorException,
  BadRequestException,
} from "@nestjs/common";
import { IntegrationRepository } from "../integration.repository";
import {
  UpdateIntegrationDto,
  MediaItemDto,
} from "../dto/update-integration.dto";
import { IntegrationResponseDto } from "../dto/integration-response.dto";
import { MediaItemProcessor } from "src/shared/media/media-item-processor";
import { MediaTargetType } from "src/shared/media/media-target-type.enum";
import {
  MediaType,
  UploadType,
  MediaItemEntity,
} from "src/shared/media/media-item/media-item.entity";
import { MediaStorageService } from "src/shared/media/storage/media-storage.service";
import type { UploadBatch } from "src/shared/media/storage/upload-batch";

@Injectable()
export class UpdateIntegrationService {
  private readonly logger = new Logger(UpdateIntegrationService.name);

  constructor(
    private readonly repository: IntegrationRepository,
    private readonly mediaProcessor: MediaItemProcessor,
    private readonly mediaStorage: MediaStorageService,
  ) {}

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
      if (dto.churchYears !== undefined)
        updateData.churchYears = dto.churchYears;
      if (dto.previousMinistry !== undefined)
        updateData.previousMinistry = dto.previousMinistry;
      if (dto.integrationYear !== undefined)
        updateData.integrationYear = dto.integrationYear;

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
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new InternalServerErrorException("Error updating integration");
    }
  }

  /**
   * Ordem segura: sobe os novos → grava as linhas → só no fim apaga os objetos
   * antigos. Falha no meio descarta os novos e mantém os antigos referenciados.
   */
  private async processImages(
    integrationId: string,
    imagesInput?: MediaItemDto[],
    files?: Express.Multer.File[],
  ): Promise<void> {
    const batch = this.mediaStorage.newBatch();
    const obsoleteUrls: string[] = [];
    try {
      await this.syncImages(
        integrationId,
        batch,
        obsoleteUrls,
        imagesInput,
        files,
      );
    } catch (error) {
      await batch.discard();
      throw error;
    }
    batch.commit();
    await this.mediaStorage.deleteAfterCommit(obsoleteUrls);
  }

  private async syncImages(
    integrationId: string,
    batch: UploadBatch,
    obsoleteUrls: string[],
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

    const imagesToUpdate = imagesInput.filter((img) => img.id);
    const imagesToCreate = imagesInput.filter((img) => !img.id);
    const processedIds: string[] = [];

    for (const imageInput of imagesToUpdate) {
      const result = await this.updateExistingImage(
        imageInput,
        existingImages,
        filesDict,
        batch,
        obsoleteUrls,
      );
      processedIds.push(result.id);
    }

    for (const imageInput of imagesToCreate) {
      const result = await this.createNewImage(
        imageInput,
        integrationId,
        filesDict,
        batch,
      );
      processedIds.push(result.id);
    }

    const idsToKeep = new Set(processedIds);
    const imagesToDelete = existingImages.filter(
      (img) => !idsToKeep.has(img.id),
    );

    for (const imageToDelete of imagesToDelete) {
      await this.deleteImage(imageToDelete, obsoleteUrls);
    }
  }

  private async updateExistingImage(
    imageInput: MediaItemDto,
    existingImages: MediaItemEntity[],
    filesDict: Record<string, Express.Multer.File>,
    batch: UploadBatch,
    obsoleteUrls: string[],
  ): Promise<MediaItemEntity> {
    const existingImage = existingImages.find(
      (img) => img.id === imageInput.id,
    );
    if (!existingImage) {
      throw new NotFoundException(
        `Integration image with id=${imageInput.id} not found`,
      );
    }

    const fieldKey = imageInput.fieldKey;
    const hasNewFile = fieldKey && filesDict[fieldKey];

    const updatedData: Partial<MediaItemEntity> = {
      title: imageInput.title ?? existingImage.title,
      description: imageInput.description ?? existingImage.description,
    };

    if (hasNewFile) {
      const file = filesDict[fieldKey];

      const uploaded = await this.uploadImage(
        file,
        existingImage.targetId,
        batch,
      );
      if (existingImage.isLocalFile && existingImage.url) {
        obsoleteUrls.push(existingImage.url);
      }

      updatedData.url = uploaded.url;
      updatedData.storageKey = uploaded.key;
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
    batch: UploadBatch,
  ): Promise<MediaItemEntity> {
    const fieldKey = imageInput.fieldKey;

    if (!fieldKey) {
      throw new BadRequestException(`New image must have a fieldKey`);
    }

    const file = filesDict[fieldKey];
    if (!file) {
      throw new BadRequestException(`File not found for fieldKey: ${fieldKey}`);
    }

    const uploaded = await this.uploadImage(file, integrationId, batch);

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

    media.url = uploaded.url;
    media.storageKey = uploaded.key;
    media.originalName = file.originalname;
    media.size = file.size;
    media.isLocalFile = true;

    return await this.mediaProcessor.saveMediaItem(media);
  }

  /** Remove a linha agora; o objeto só sai do bucket depois (obsoleteUrls). */
  private async deleteImage(
    image: MediaItemEntity,
    obsoleteUrls: string[],
  ): Promise<void> {
    if (image.isLocalFile && image.url) obsoleteUrls.push(image.url);
    await this.mediaProcessor.removeMediaItem(image);
  }

  private async uploadImage(
    file: Express.Multer.File,
    ownerId: string,
    batch: UploadBatch,
  ): Promise<{ url: string; key: string }> {
    await this.mediaStorage.uploadAll(
      [
        {
          file,
          mediaType: MediaType.IMAGE,
          entity: MediaTargetType.Integration,
          ownerId,
        },
      ],
      batch,
    );
    return batch.objects[batch.objects.length - 1];
  }
}
