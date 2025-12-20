import {
    Injectable,
    Logger,
    BadRequestException,
  } from '@nestjs/common';
  import { EventRepository } from '../event.repository';
  import { EventEntity } from '../entities/event.entity';
  import { MediaItemProcessor } from 'src/share/media/media-item-processor';
  import { AwsS3Service } from 'src/aws/aws-s3.service';
  import { MediaTargetType } from 'src/share/media/media-target-type.enum';
  import { MediaType } from 'src/share/media/media-item/media-item.entity';
import { CreateEventDto } from '../dto/create-event.dto';
  
  @Injectable()
  export class CreateEventService {
    private readonly logger = new Logger(CreateEventService.name);
  
    constructor(
      private readonly eventRepo: EventRepository,
      private readonly s3Service: AwsS3Service,
      private readonly mediaItemProcessor: MediaItemProcessor,
    ) {}
  
    async create(
      dto: CreateEventDto,
      file?: Express.Multer.File,
    ): Promise<EventEntity> {
      try {
        const event = this.eventRepo.create({
          title: dto.title,
          date: dto.date,
          location: dto.location,
          description: dto.description,
        });
  
        const savedEvent = await this.eventRepo.save(event);
  
        let mediaUrl = dto.media.url?.trim() || '';
        let originalName = dto.media.originalName;
        let size = dto.media.size;
  
        if (dto.media.isLocalFile) {
          if (!file) throw new BadRequestException('File not sent.');
          mediaUrl = await this.s3Service.upload(file);
          originalName = file.originalname;
          size = file.size;
        }
  
        const mediaEntity = this.mediaItemProcessor.buildBaseMediaItem(
          {
            title: dto.media.title,
            description: dto.media.description,
            mediaType: dto.media.mediaType ?? MediaType.IMAGE,
            uploadType: dto.media.uploadType,
            platformType: dto.media.platformType ?? null,
            fileField: 'file',
            isLocalFile: dto.media.isLocalFile,
            url: mediaUrl,
            originalName,
            size,
          },
          savedEvent.id,
          MediaTargetType.Event,
        );
  
        await this.mediaItemProcessor.saveMediaItem(mediaEntity);
  
        return savedEvent;
      } catch (error) {
        this.logger.error('Error creating event', error.stack);
        throw new BadRequestException(
          error?.message || 'Erro inesperado ao criar evento.',
        );
      }
    }
  }
  