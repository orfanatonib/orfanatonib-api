import {
  Injectable,
  Logger,
  InternalServerErrorException,
} from "@nestjs/common";
import { EventRepository } from "../event.repository";
import { MediaItemProcessor } from "src/shared/media/media-item-processor";
import { MediaStorageService } from "src/shared/media/storage/media-storage.service";
import {
  MediaType,
  UploadType,
} from "src/shared/media/media-item/media-item.entity";
import { EventEntity } from "../entities/event.entity";
import { CreateEventDto } from "../dto/create-event.dto";
import { EventNotificationHelper } from "./event-notification.helper";

export const EVENT_MEDIA_TARGET = "Event";

@Injectable()
export class CreateEventService {
  private readonly logger = new Logger(CreateEventService.name);

  constructor(
    private readonly eventRepo: EventRepository,
    private readonly mediaItemProcessor: MediaItemProcessor,
    private readonly mediaStorage: MediaStorageService,
    private readonly eventNotificationHelper: EventNotificationHelper,
  ) {}

  /**
   * Se a mídia falha depois do evento criado, o upload é descartado e o evento
   * removido: uma criação que falha não deixa linha nem objeto no bucket.
   */
  async create(
    dto: CreateEventDto,
    file?: Express.Multer.File,
  ): Promise<EventEntity> {
    this.logger.log("Creating new event");

    // `media` descreve o anexo; não é coluna do evento.
    const { media, ...eventData } = dto;
    void media;
    const event = await this.eventRepo.create(eventData);

    if (file) {
      const batch = this.mediaStorage.newBatch();
      try {
        await this.mediaStorage.uploadAll(
          [
            {
              file,
              mediaType: MediaType.IMAGE,
              entity: EVENT_MEDIA_TARGET,
              ownerId: event.id,
            },
          ],
          batch,
        );
        const [uploaded] = batch.objects;
        const media = this.mediaItemProcessor.buildBaseMediaItem(
          {
            title: dto.title || "Event image",
            description: dto.description || "",
            mediaType: MediaType.IMAGE,
            uploadType: UploadType.UPLOAD,
            url: uploaded.url,
            isLocalFile: true,
            originalName: file.originalname,
            size: file.size,
          },
          event.id,
          EVENT_MEDIA_TARGET,
        );
        media.storageKey = uploaded.key;
        await this.mediaItemProcessor.saveMediaItem(media);
        batch.commit();
        this.logger.log(`Media saved for event ${event.id}`);
      } catch (error) {
        await batch.discard();
        await this.eventRepo.remove(event.id);
        this.logger.error(
          "Error processing media for event",
          error instanceof Error ? error.stack : undefined,
        );
        if (error instanceof Error && "getStatus" in error) throw error;
        throw new InternalServerErrorException("Error processing event media");
      }
    }

    this.eventNotificationHelper
      .notifyEventCreated(event)
      .catch((error: unknown) => {
        this.logger.error(
          `Failed to send event creation notification: ${error instanceof Error ? error.message : String(error)}`,
        );
      });

    return event;
  }
}
