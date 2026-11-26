import {
  Injectable,
  Logger,
  NotFoundException,
  InternalServerErrorException,
} from "@nestjs/common";
import type { EntityManager } from "typeorm";
import { EventRepository } from "../event.repository";
import { MediaItemProcessor } from "src/shared/media/media-item-processor";
import { MediaStorageService } from "src/shared/media/storage/media-storage.service";
import type { UploadBatch } from "src/shared/media/storage/upload-batch";
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

    // Ordem segura: o evento e a mídia se gravam na MESMA transação; o arquivo novo sobe antes (descartável se algo
    // falhar) e o antigo só sai do bucket depois do commit. Falhou ⇒ o evento não muda e o bucket fica como estava.
    const batch = this.mediaStorage.newBatch();
    const obsoleteUrls: string[] = [];
    try {
      await this.eventRepo.runInTransaction(async (manager) => {
        await this.eventRepo.update(id, eventData, manager);
        const unit = { manager, batch, obsoleteUrls };
        if (file || (media && media.url)) {
          await this.updateEventMedia(id, media, file, unit);
        } else if (media && media.url === null) {
          // O formulário manda `media.url = null` para "remover a imagem".
          await this.removeEventMedia(id, unit);
        }
      });
      batch.commit();
      await this.mediaStorage.deleteAfterCommit(obsoleteUrls);
    } catch (error) {
      await batch.discard();
      throw error;
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

  /** Remove a imagem do evento: a linha sai na transação e o arquivo só depois do commit. */
  private async removeEventMedia(
    eventId: string,
    unit: { manager: EntityManager; obsoleteUrls: string[] },
  ): Promise<void> {
    const existing = await this.mediaItemProcessor.findMediaItemsByTarget(
      eventId,
      EVENT_MEDIA_TARGET,
    );
    unit.obsoleteUrls.push(
      ...(await this.mediaItemProcessor.removeMediaItemsKeepingFiles(
        existing,
        unit.manager,
      )),
    );
  }

  /**
   * Ordem segura: envia o novo → grava a linha → só então apaga o arquivo
   * antigo. Falha antes disso descarta o novo e mantém o antigo referenciado.
   */
  private async updateEventMedia(
    eventId: string,
    mediaInput: EventMediaInput | undefined,
    file: Express.Multer.File | undefined,
    unit: {
      manager: EntityManager;
      batch: UploadBatch;
      obsoleteUrls: string[];
    },
  ): Promise<void> {
    const { batch } = unit;
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
        await this.mediaItemProcessor.upsertMediaItem(
          existing.id,
          media,
          unit.manager,
        );
      } else {
        await this.mediaItemProcessor.saveMediaItem(media, unit.manager);
      }

      if (existing?.isLocalFile && existing.url) {
        unit.obsoleteUrls.push(existing.url);
      }
    } catch (error) {
      this.logger.error(
        "Error updating event media",
        error instanceof Error ? error.stack : undefined,
      );
      if (error instanceof Error && "getStatus" in error) throw error;
      throw new InternalServerErrorException("Error updating event media");
    }
  }
}
