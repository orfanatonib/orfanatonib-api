import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { EventRepository } from '../event.repository';
import { MediaItemProcessor } from 'src/shared/media/media-item-processor';
import { AwsS3Service } from 'src/infrastructure/aws/aws-s3.service';
import { EventNotificationHelper } from './event-notification.helper';

@Injectable()
export class DeleteEventService {
  private readonly logger = new Logger(DeleteEventService.name);

  constructor(
    private readonly eventRepo: EventRepository,
    private readonly mediaItemProcessor: MediaItemProcessor,
    private readonly s3Service: AwsS3Service,
    private readonly eventNotificationHelper: EventNotificationHelper,
  ) {}

  async remove(id: string): Promise<void> {
    try {
      const event = await this.eventRepo.findById(id);
      if (!event) {
        throw new NotFoundException('Event not found');
      }

      const mediaItems = await this.mediaItemProcessor.findMediaItemsByTarget(id, 'Event');

      if (mediaItems.length > 0) {
        await this.mediaItemProcessor.deleteMediaItems(
          mediaItems,
          this.s3Service.delete.bind(this.s3Service),
        );
        this.logger.log(`Deleted ${mediaItems.length} media items for event ${id}`);
      }

      await this.eventRepo.remove(id);
      this.logger.log(`Event ${id} deleted successfully`);

      this.eventNotificationHelper.notifyEventDeleted(event).catch((error) => {
        this.logger.error(`Failed to send event deletion notification: ${error.message}`);
      });
    } catch (error) {
      this.logger.error(`Error deleting event ${id}`, error.stack);
      throw error;
    }
  }
}
