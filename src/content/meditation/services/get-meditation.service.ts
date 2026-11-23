import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
} from "@nestjs/common";
import { MediaItemProcessor } from "src/shared/media/media-item-processor";
import { MeditationRepository } from "../meditation.repository";
import { WeekMeditationResponseDto } from "../dto/meditation-response.dto";
import { MediaTargetType } from "src/shared/media/media-target-type.enum";
import { QueryMeditationDto } from "../dto/query-meditation.dto";
import { MeditationEntity } from "../entities/meditation.entity";
import { MeditationSortBy } from "../enums/meditation-sort-by.enum";
import { PaginatedResponseDto } from "src/shared/dto/paginated-response.dto";
import {
  isPaginated,
  toPaginated,
} from "src/shared/list-query/list-query.util";

@Injectable()
export class GetMeditationService {
  private readonly logger = new Logger(GetMeditationService.name);

  constructor(
    private readonly meditationRepo: MeditationRepository,
    private readonly mediaItemProcessor: MediaItemProcessor,
  ) {}

  async findAll(
    query?: QueryMeditationDto,
  ): Promise<
    | WeekMeditationResponseDto[]
    | PaginatedResponseDto<WeekMeditationResponseDto>
  > {
    const { items, total } = await this.meditationRepo.findFiltered(query);
    const data = await this.toResponses(items);
    if (query && isPaginated(query)) {
      return toPaginated(
        data,
        query,
        total,
        query.sortBy ?? MeditationSortBy.START_DATE,
      );
    }
    return data;
  }

  private async toResponses(
    meditations: MeditationEntity[],
  ): Promise<WeekMeditationResponseDto[]> {
    if (!meditations.length) {
      return [];
    }

    const ids = meditations.map((m) => m.id);
    const mediaItems =
      await this.mediaItemProcessor.findManyMediaItemsByTargets(
        ids,
        MediaTargetType.Meditation,
      );

    const mediaMap = new Map<string, (typeof mediaItems)[number][]>();
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
    if (!id || typeof id !== "string") {
      throw new BadRequestException("Invalid ID provided");
    }

    const meditation = await this.meditationRepo.findOneWithRelations(id);
    if (!meditation) {
      this.logger.warn(`Meditation not found: ID=${id}`);
      throw new NotFoundException("Meditation not found");
    }
    const media = await this.mediaItemProcessor.findMediaItemByTarget(
      meditation.id,
      MediaTargetType.Meditation,
    );
    return WeekMeditationResponseDto.success(meditation, media);
  }

  async getThisWeekMeditation(): Promise<WeekMeditationResponseDto> {
    const today = new Date();
    const todayLocal = parseDateAsLocal(
      `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`,
    );

    const all = await this.meditationRepo.findAllWithRelations();

    for (const m of all) {
      const start = parseDateAsLocal(m.startDate.toString());
      const end = parseDateAsLocal(m.endDate.toString());

      if (todayLocal >= start && todayLocal <= end) {
        const mediaList = await this.mediaItemProcessor.findMediaItemsByTarget(
          m.id,
          MediaTargetType.Meditation,
        );
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
  const clean = dateStr.split("T")[0];
  const [year, month, day] = clean.split("-").map(Number);
  return new Date(year, month - 1, day);
}
