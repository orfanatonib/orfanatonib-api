import { Injectable, Logger, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { EventRepository } from '../event.repository';
import { MediaItemProcessor } from 'src/shared/media/media-item-processor';
import { AwsS3Service } from 'src/infrastructure/aws/aws-s3.service';
import { MediaType, UploadType } from 'src/shared/media/media-item/media-item.entity';
import { EventEntity } from '../entities/event.entity';

@Injectable()
export class CreateEventService {
  private readonly logger = new Logger(CreateEventService.name);

  constructor(
    private readonly eventRepo: EventRepository,
    private readonly mediaItemProcessor: MediaItemProcessor,
    private readonly s3Service: AwsS3Service,
  ) {}

  async create(dto: any, file?: Express.Multer.File): Promise<EventEntity> {
    this.logger.log('Creating new event');

    const event = await this.eventRepo.create({ ...dto });

    if (file) {
      try {
        const fileUrl = await this.s3Service.upload(file);
        const media = this.mediaItemProcessor.buildBaseMediaItem(
          {
            title: dto.title || 'Event image',
            description: dto.description || '',
            mediaType: MediaType.IMAGE,
            uploadType: UploadType.UPLOAD,
            url: fileUrl,
            isLocalFile: true,
            originalName: file.originalname,
            size: file.size,
          },
          event.id,
          'Event',
        );
        await this.mediaItemProcessor.saveMediaItem(media);
        this.logger.log(`Media saved for event ${event.id}`);
      } catch (error) {
        this.logger.error(`Error processing media for event`, error.stack);
        throw new InternalServerErrorException('Error processing event media');
      }
    }

    return event;
  }
}