import { Injectable, Logger, NotFoundException, InternalServerErrorException } from '@nestjs/common';
import { EventRepository } from '../event.repository';
import { MediaItemProcessor } from 'src/shared/media/media-item-processor';
import { AwsS3Service } from 'src/infrastructure/aws/aws-s3.service';
import { MediaType, UploadType } from 'src/shared/media/media-item/media-item.entity';
import { EventEntity } from '../entities/event.entity';
import { EventNotificationHelper } from './event-notification.helper';

@Injectable()
export class UpdateEventService {
  private readonly logger = new Logger(UpdateEventService.name);

  constructor(
    private readonly eventRepo: EventRepository,
    private readonly mediaItemProcessor: MediaItemProcessor,
    private readonly s3Service: AwsS3Service,
    private readonly eventNotificationHelper: EventNotificationHelper,
  ) {}

  async update(id: string, dto: any, file?: Express.Multer.File): Promise<EventEntity> {
    const originalEvent = await this.eventRepo.findById(id);
    if (!originalEvent) throw new NotFoundException('Event not found');

    const originalEventSnapshot = { ...originalEvent } as EventEntity;

    const { media, isLocalFile, ...eventData } = dto;

    await this.eventRepo.update(id, eventData);

    if (file || (media && media.url)) {
      await this.updateEventMedia(id, media, file);
    }

    const updated = await this.eventRepo.findById(id);
    if (!updated) throw new NotFoundException('Event not found');

    this.eventNotificationHelper
      .notifyEventUpdated(originalEventSnapshot, updated)
      .catch((error) => {
        this.logger.error(`Failed to send event update notification: ${error.message}`);
      });

    return updated;
  }

  private async updateEventMedia(
    eventId: string,
    mediaInput: any,
    file?: Express.Multer.File,
  ): Promise<void> {
    try {
      const existingMedia = await this.mediaItemProcessor.findMediaItemByTarget(eventId, 'Event');

      if (file) {
        if (existingMedia) {
          if (existingMedia.isLocalFile && existingMedia.url) {
            try {
              await this.s3Service.delete(existingMedia.url);
            } catch (error) {
              this.logger.warn(`Could not delete old file: ${existingMedia.url}`);
            }
          }

          const fileUrl = await this.s3Service.upload(file);
          const media = this.mediaItemProcessor.buildBaseMediaItem(
            {
              title: mediaInput?.title || 'Event image',
              description: mediaInput?.description || '',
              mediaType: MediaType.IMAGE,
              uploadType: UploadType.UPLOAD,
              url: fileUrl,
              isLocalFile: true,
              originalName: file.originalname,
              size: file.size,
            },
            eventId,
            'Event',
          );
          await this.mediaItemProcessor.upsertMediaItem(existingMedia.id, media);
        } else {
          const fileUrl = await this.s3Service.upload(file);
          const media = this.mediaItemProcessor.buildBaseMediaItem(
            {
              title: mediaInput?.title || 'Event image',
              description: mediaInput?.description || '',
              mediaType: MediaType.IMAGE,
              uploadType: UploadType.UPLOAD,
              url: fileUrl,
              isLocalFile: true,
              originalName: file.originalname,
              size: file.size,
            },
            eventId,
            'Event',
          );
          await this.mediaItemProcessor.saveMediaItem(media);
        }
      } else if (mediaInput && mediaInput.url && !mediaInput.isLocalFile) {
        if (existingMedia) {
          const media = this.mediaItemProcessor.buildBaseMediaItem(
            {
              title: mediaInput.title || 'Event image',
              description: mediaInput.description || '',
              mediaType: MediaType.IMAGE,
              uploadType: UploadType.LINK,
              url: mediaInput.url,
              isLocalFile: false,
            },
            eventId,
            'Event',
          );
          await this.mediaItemProcessor.upsertMediaItem(existingMedia.id, media);
        } else {
          const media = this.mediaItemProcessor.buildBaseMediaItem(
            {
              title: mediaInput.title || 'Event image',
              description: mediaInput.description || '',
              mediaType: MediaType.IMAGE,
              uploadType: UploadType.LINK,
              url: mediaInput.url,
              isLocalFile: false,
            },
            eventId,
            'Event',
          );
          await this.mediaItemProcessor.saveMediaItem(media);
        }
      }
    } catch (error) {
      this.logger.error(`Error updating event media`, error.stack);
      throw new InternalServerErrorException('Error updating event media');
    }
  }
}
