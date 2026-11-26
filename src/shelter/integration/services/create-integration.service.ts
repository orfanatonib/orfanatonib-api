import { Injectable, Logger } from "@nestjs/common";
import { IntegrationRepository } from "../integration.repository";
import { CreateIntegrationDto } from "../dto/create-integration.dto";
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
export class CreateIntegrationService {
  private readonly logger = new Logger(CreateIntegrationService.name);

  constructor(
    private readonly repository: IntegrationRepository,
    private readonly mediaProcessor: MediaItemProcessor,
    private readonly mediaStorage: MediaStorageService,
  ) {}

  async execute(
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

    const media: MediaItemEntity[] = [];
    const batch = this.mediaStorage.newBatch();

    try {
      if (dto.images && dto.images.length > 0) {
        const uploadedFiles: { [key: string]: { url: string; key: string } } =
          {};

        for (let i = 0; i < dto.images.length; i++) {
          const imageDto = dto.images[i];
          let mediaUrl = imageDto.url?.trim() || "";
          let storageKey: string | undefined;
          let uploadType = UploadType.LINK;
          let isLocalFile = imageDto.isLocalFile || false;
          let originalName: string | undefined;
          let size: number | undefined;

          if (files && files.length > 0 && !mediaUrl) {
            const fileIndex = Math.min(i, files.length - 1);
            const file = files[fileIndex];

            if (!uploadedFiles[file.originalname]) {
              uploadedFiles[file.originalname] = await this.uploadImage(
                file,
                integration.id,
                batch,
              );
            }

            mediaUrl = uploadedFiles[file.originalname].url;
            storageKey = uploadedFiles[file.originalname].key;
            uploadType = UploadType.UPLOAD;
            isLocalFile = true;
            originalName = file.originalname;
            size = file.size;
          }

          if (mediaUrl) {
            const mediaEntity = this.mediaProcessor.buildBaseMediaItem(
              {
                title: imageDto.title || dto.name || "Integration image",
                description: imageDto.description || "",
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
            mediaEntity.storageKey = storageKey;

            media.push(await this.mediaProcessor.saveMediaItem(mediaEntity));
          }
        }
      } else if (files && files.length > 0) {
        for (const file of files) {
          const uploaded = await this.uploadImage(file, integration.id, batch);
          const mediaEntity = this.mediaProcessor.buildBaseMediaItem(
            {
              title: dto.name || "Integration image",
              description: "",
              mediaType: MediaType.IMAGE,
              uploadType: UploadType.UPLOAD,
              url: uploaded.url,
              isLocalFile: true,
              originalName: file.originalname,
              size: file.size,
            },
            integration.id,
            MediaTargetType.Integration,
          );
          mediaEntity.storageKey = uploaded.key;

          media.push(await this.mediaProcessor.saveMediaItem(mediaEntity));
        }
      }
    } catch (error) {
      // Criação que falha não deixa nada: objetos enviados, linhas de mídia e a integração.
      await batch.discard();
      await this.mediaProcessor.removeMediaItemsKeepingFiles(media);
      await this.repository.remove(integration.id);
      throw error;
    }
    batch.commit();

    return IntegrationResponseDto.fromEntity(integration, media);
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
