import type { EntityManager } from "typeorm";
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

/** O que a edição inteira compartilha: a transação, o lote de uploads descartável e os arquivos a apagar depois do commit. */
interface ImageWriteUnit {
  manager: EntityManager;
  batch: UploadBatch;
  obsoleteUrls: string[];
}

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

    // Ordem segura: o cadastro e as fotos se gravam na MESMA transação; os arquivos novos sobem antes (descartáveis se
    // algo falhar) e os antigos só saem do bucket depois do commit. Falhou ⇒ nada muda e o bucket fica como estava.
    const batch = this.mediaStorage.newBatch();
    const obsoleteUrls: string[] = [];
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

      const updated = await this.repository.runInTransaction(
        async (manager) => {
          const row = await this.repository.update(id, updateData, manager);
          if (dto.images || (files && files.length > 0)) {
            await this.syncImages(
              id,
              { manager, batch, obsoleteUrls },
              dto.images,
              files,
            );
          }
          return row;
        },
      );
      batch.commit();
      await this.mediaStorage.deleteAfterCommit(obsoleteUrls);

      const mediaItems = await this.mediaProcessor.findMediaItemsByTarget(
        id,
        MediaTargetType.Integration,
      );

      return IntegrationResponseDto.fromEntity(updated!, mediaItems);
    } catch (error) {
      // Falhou: os arquivos novos saem do bucket e os antigos seguem referenciados.
      await batch.discard();
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new InternalServerErrorException("Error updating integration");
    }
  }

  private async syncImages(
    integrationId: string,
    unit: ImageWriteUnit,
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
        unit,
      );
      processedIds.push(result.id);
    }

    for (const imageInput of imagesToCreate) {
      const result = await this.createNewImage(
        imageInput,
        integrationId,
        filesDict,
        unit,
      );
      processedIds.push(result.id);
    }

    const idsToKeep = new Set(processedIds);
    const imagesToDelete = existingImages.filter(
      (img) => !idsToKeep.has(img.id),
    );

    for (const imageToDelete of imagesToDelete) {
      await this.deleteImage(imageToDelete, unit);
    }
  }

  private async updateExistingImage(
    imageInput: MediaItemDto,
    existingImages: MediaItemEntity[],
    filesDict: Record<string, Express.Multer.File>,
    unit: ImageWriteUnit,
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
        unit.batch,
      );
      if (existingImage.isLocalFile && existingImage.url) {
        unit.obsoleteUrls.push(existingImage.url);
      }

      updatedData.url = uploaded.url;
      updatedData.storageKey = uploaded.key;
      updatedData.originalName = file.originalname;
      updatedData.size = file.size;
      updatedData.isLocalFile = true;
      updatedData.uploadType = UploadType.UPLOAD;
      updatedData.mediaType = MediaType.IMAGE;
    }

    return await this.mediaProcessor.upsertMediaItem(
      existingImage.id,
      { ...existingImage, ...updatedData },
      unit.manager,
    );
  }

  private async createNewImage(
    imageInput: MediaItemDto,
    integrationId: string,
    filesDict: Record<string, Express.Multer.File>,
    unit: ImageWriteUnit,
  ): Promise<MediaItemEntity> {
    const fieldKey = imageInput.fieldKey;

    if (!fieldKey) {
      throw new BadRequestException(`New image must have a fieldKey`);
    }

    const file = filesDict[fieldKey];
    if (!file) {
      throw new BadRequestException(`File not found for fieldKey: ${fieldKey}`);
    }

    const uploaded = await this.uploadImage(file, integrationId, unit.batch);

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

    return await this.mediaProcessor.saveMediaItem(media, unit.manager);
  }

  /** Remove a linha na transação; o objeto só sai do bucket depois do commit. */
  private async deleteImage(
    image: MediaItemEntity,
    unit: ImageWriteUnit,
  ): Promise<void> {
    unit.obsoleteUrls.push(
      ...(await this.mediaProcessor.removeMediaItemsKeepingFiles(
        [image],
        unit.manager,
      )),
    );
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
