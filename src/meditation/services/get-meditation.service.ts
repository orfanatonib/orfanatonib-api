import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { MediaItemProcessor } from 'src/share/media/media-item-processor';
import { MeditationRepository } from '../meditation.repository';
import { WeekMeditationResponseDto } from '../dto/meditation-response-dto';
import { MeditationEntity } from '../entities/meditation.entity';
import { MediaTargetType } from 'src/share/media/media-target-type.enum';

@Injectable()
export class GetMeditationService {
  private readonly logger = new Logger(GetMeditationService.name);

  constructor(
    private readonly meditationRepo: MeditationRepository,
    private readonly mediaItemProcessor: MediaItemProcessor,
  ) { }

  async findAll(): Promise<WeekMeditationResponseDto[]> {
    const meditations = await this.meditationRepo.findAllWithRelations();
    if (!meditations.length) {
      return [];
    }

    const ids = meditations.map((m) => m.id);
    const mediaItems = await this.mediaItemProcessor.findManyMediaItemsByTargets(ids, MediaTargetType.Meditation);

    const mediaMap = new Map<string, typeof mediaItems[number][]>();
    mediaItems.forEach((item) => {
      const list = mediaMap.get(item.targetId) || [];
      list.push(item);
      mediaMap.set(item.targetId, list);
    });

    return meditations.map((meditation) => {
      const media = mediaMap.get(meditation.id)?.[0] || null;
      if (!media) {
        this.logger.warn(`Meditation without media: "${meditation.topic}"`);
      }
      return WeekMeditationResponseDto.success(meditation, media);
    });
  }

  async findOne(id: string): Promise<WeekMeditationResponseDto> {
    if (!id || typeof id !== 'string') {
      throw new BadRequestException('Invalid ID provided');
    }

    const meditation = await this.meditationRepo.findOneWithRelations(id);
    if (!meditation) {
      this.logger.warn(`Meditation not found: ID=${id}`);
      throw new NotFoundException('Meditation not found');
    }
    const media = await this.mediaItemProcessor.findMediaItemByTarget(meditation.id, MediaTargetType.Meditation);
    return WeekMeditationResponseDto.success(meditation, media);
  }

  async getThisWeekMeditation(): Promise<WeekMeditationResponseDto> {
    const today = new Date();
    const todayLocal = parseDateAsLocal(
      `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
    );

    const all = await this.meditationRepo.findAllWithRelations();

    for (const m of all) {
      const start = parseDateAsLocal(m.startDate.toString());
      const end = parseDateAsLocal(m.endDate.toString());

      if (todayLocal >= start && todayLocal <= end) {
        const mediaList = await this.mediaItemProcessor.findMediaItemsByTarget(m.id, MediaTargetType.Meditation);
        const media = mediaList?.[0];

        if (!media) {
          this.logger.warn(`No media linked to meditation ID=${m.id}`);
          return WeekMeditationResponseDto.notFound();
        }

        return WeekMeditationResponseDto.success(m, media);
      }
    }

    return WeekMeditationResponseDto.notFound();
  }
}

function parseDateAsLocal(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
}
