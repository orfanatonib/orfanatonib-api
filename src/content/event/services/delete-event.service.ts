import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { EventRepository } from "../event.repository";
import { MediaItemProcessor } from "src/shared/media/media-item-processor";
import { MediaStorageService } from "src/shared/media/storage/media-storage.service";
import { EventNotificationHelper } from "./event-notification.helper";
import { EVENT_MEDIA_TARGET } from "./create-event.service";

@Injectable()
export class DeleteEventService {
  private readonly logger = new Logger(DeleteEventService.name);

  constructor(
    private readonly eventRepo: EventRepository,
    private readonly mediaItemProcessor: MediaItemProcessor,
    private readonly mediaStorage: MediaStorageService,
    private readonly eventNotificationHelper: EventNotificationHelper,
  ) {}

  /**
   * Linhas primeiro, objetos do bucket depois: se o banco falha, nenhum objeto
   * foi apagado (sem referência quebrada); se o bucket falha, o objeto vai para
   * a fila de limpeza (sem órfão silencioso).
   */
  async remove(id: string): Promise<void> {
    try {
      const event = await this.eventRepo.findById(id);
      if (!event) {
        throw new NotFoundException("Event not found");
      }

      const mediaItems = await this.mediaItemProcessor.findMediaItemsByTarget(
        id,
        EVENT_MEDIA_TARGET,
      );

      await this.eventRepo.remove(id);
      const fileUrls =
        await this.mediaItemProcessor.removeMediaItemsKeepingFiles(mediaItems);
      await this.mediaStorage.deleteAfterCommit(fileUrls);
      this.logger.log(`Event ${id} deleted successfully`);

      this.eventNotificationHelper
        .notifyEventDeleted(event)
        .catch((error: unknown) => {
          this.logger.error(
            `Failed to send event deletion notification: ${error instanceof Error ? error.message : String(error)}`,
          );
        });
    } catch (error) {
      this.logger.error(
        `Error deleting event ${id}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }
}
