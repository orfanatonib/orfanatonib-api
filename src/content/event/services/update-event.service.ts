import {
  Injectable,
  Logger,
  NotFoundException,
  InternalServerErrorException,
} from "@nestjs/common";
import { EventRepository } from "../event.repository";
import { MediaItemProcessor } from "src/shared/media/media-item-processor";
import { MediaStorageService } from "src/shared/media/storage/media-storage.service";
import {
  MediaItemEntity,
  MediaType,
  UploadType,
} from "src/shared/media/media-item/media-item.entity";
import { EventEntity } from "../entities/event.entity";
import { UpdateEventDto } from "../dto/update-event.dto";
import type { EventMediaInput } from "../dto/event-media-input";
import { EventNotificationHelper } from "./event-notification.helper";
import { EVENT_MEDIA_TARGET } from "./create-event.service";

@Injectable()
export class UpdateEventService {
  private readonly logger = new Logger(UpdateEventService.name);

  constructor(
    private readonly eventRepo: EventRepository,
    private readonly mediaItemProcessor: MediaItemProcessor,
    private readonly mediaStorage: MediaStorageService,
    private readonly eventNotificationHelper: EventNotificationHelper,
  ) {}

  async update(
    id: string,
    dto: UpdateEventDto,
    file?: Express.Multer.File,
  ): Promise<EventEntity> {
    const originalEvent = await this.eventRepo.findById(id);
    if (!originalEvent) throw new NotFoundException("Event not found");

    const originalEventSnapshot = { ...originalEvent } as EventEntity;

    const { media, ...eventData } = dto;

    await this.eventRepo.update(id, eventData);

    if (file || (media && media.url)) {
      await this.updateEventMedia(id, media, file);
    }

    const updated = await this.eventRepo.findById(id);
    if (!updated) throw new NotFoundException("Event not found");

    this.eventNotificationHelper
      .notifyEventUpdated(originalEventSnapshot, updated)
      .catch((error: unknown) => {
        this.logger.error(
          `Failed to send event update notification: ${error instanceof Error ? error.message : String(error)}`,
        );
      });

    return updated;
  }

  /**
   * Ordem segura: envia o novo → grava a linha → só então apaga o arquivo
   * antigo. Falha antes disso descarta o novo e mantém o antigo referenciado.
   */
  private async updateEventMedia(
    eventId: string,
    mediaInput: EventMediaInput | undefined,
    file?: Express.Multer.File,
  ): Promise<void> {
    const batch = this.mediaStorage.newBatch();
    try {
      const existing = await this.mediaItemProcessor.findMediaItemByTarget(
        eventId,
        EVENT_MEDIA_TARGET,
      );

      let media: MediaItemEntity | null = null;
      if (file) {
        await this.mediaStorage.uploadAll(
          [
            {
              file,
              mediaType: MediaType.IMAGE,
              entity: EVENT_MEDIA_TARGET,
              ownerId: eventId,
            },
          ],
          batch,
        );
        const [uploaded] = batch.objects;
        media = this.mediaItemProcessor.buildBaseMediaItem(
          {
            title: mediaInput?.title || "Event image",
            description: mediaInput?.description || "",
            mediaType: MediaType.IMAGE,
            uploadType: UploadType.UPLOAD,
            url: uploaded.url,
            isLocalFile: true,
            originalName: file.originalname,
            size: file.size,
          },
          eventId,
          EVENT_MEDIA_TARGET,
        );
        media.storageKey = uploaded.key;
      } else if (mediaInput?.url && !mediaInput.isLocalFile) {
        media = this.mediaItemProcessor.buildBaseMediaItem(
          {
            title: mediaInput.title || "Event image",
            description: mediaInput.description || "",
            mediaType: MediaType.IMAGE,
            uploadType: UploadType.LINK,
            url: mediaInput.url,
            isLocalFile: false,
          },
          eventId,
          EVENT_MEDIA_TARGET,
        );
      }

      if (!media) return;

      if (existing) {
        await this.mediaItemProcessor.upsertMediaItem(existing.id, media);
      } else {
        await this.mediaItemProcessor.saveMediaItem(media);
      }
      batch.commit();

      if (existing?.isLocalFile && existing.url) {
        await this.mediaStorage.deleteAfterCommit([existing.url]);
      }
    } catch (error) {
      await batch.discard();
      this.logger.error(
        "Error updating event media",
        error instanceof Error ? error.stack : undefined,
      );
      if (error instanceof Error && "getStatus" in error) throw error;
      throw new InternalServerErrorException("Error updating event media");
    }
  }
}
