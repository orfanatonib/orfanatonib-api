import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { EventRepository } from '../event.repository';
import { MediaItemProcessor } from 'src/share/media/media-item-processor';
import { MediaTargetType } from 'src/share/media/media-target-type.enum';
import { MediaItemEntity } from 'src/share/media/media-item/media-item.entity';
import { EventResponseDto } from '../dto/event-response-dto';
@Injectable()
export class GetEventService {
  private readonly logger = new Logger(GetEventService.name);

  constructor(
    private readonly eventRepo: EventRepository,
    private readonly mediaItemProcessor: MediaItemProcessor,
  ) {}

  async findAll(): Promise<EventResponseDto[]> {
    const events = await this.eventRepo.findAll();

    if (!events.length) {
      return [];
    }

    const mediaMap = await this.buildMediaMap(events.map((e) => e.id));

    return events.map((event) => {
      const media = mediaMap.get(event.id)?.[0] ?? null;

      if (!media) {
        this.logger.warn(`Event without media: "${event.title}"`);
      }

      return EventResponseDto.fromEntity(event, media);
    });
  }

  async findOne(id: string): Promise<EventResponseDto> {
    if (!id || typeof id !== 'string') {
      throw new BadRequestException('Invalid ID provided');
    }

    const event = await this.eventRepo.findById(id);

    if (!event) {
      this.logger.warn(`Event not found: ID=${id}`);
      throw new NotFoundException('Event not found');
    }

    const media = await this.mediaItemProcessor.findMediaItemByTarget(
      event.id,
      MediaTargetType.Event,
    );

    return EventResponseDto.fromEntity(event, media);
  }

  async getUpcomingOrTodayEvents(): Promise<EventResponseDto[]> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const allEvents = await this.eventRepo.findAll();

    const futureEvents = allEvents.filter((event) => {
      const eventDate = new Date(event.date);
      eventDate.setHours(0, 0, 0, 0);
      return eventDate >= today;
    });

    if (!futureEvents.length) {
      return [];
    }

    const mediaMap = await this.buildMediaMap(futureEvents.map((e) => e.id));

    return futureEvents.map((event) => {
      const media = mediaMap.get(event.id)?.[0] ?? null;

      if (!media) {
        this.logger.warn(`Event without media: "${event.title}"`);
      }

      return EventResponseDto.fromEntity(event, media);
    });
  }

  private async buildMediaMap(ids: string[]): Promise<Map<string, MediaItemEntity[]>> {
    const mediaItems = await this.mediaItemProcessor.findManyMediaItemsByTargets(
      ids,
      MediaTargetType.Event,
    );

    const map = new Map<string, MediaItemEntity[]>();

    for (const item of mediaItems) {
      const group = map.get(item.targetId) || [];
      group.push(item);
      map.set(item.targetId, group);
    }

    return map;
  }
}
