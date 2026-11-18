import type {
  MediaItemEntity,
  MediaType,
  PlatformType,
  UploadType,
} from "src/shared/media/media-item/media-item.entity";
import type { DayEntity } from "../entities/day.entity";
import type { MeditationEntity } from "../entities/meditation.entity";

export enum WeekDay {
  Monday = "Monday",
  Tuesday = "Tuesday",
  Wednesday = "Wednesday",
  Thursday = "Thursday",
  Friday = "Friday",
}

export class MediaItemDto {
  id: string;
  title: string;
  description: string;
  mediaType: MediaType;
  typeUpload: UploadType;
  url: string;
  isLocalFile: boolean;
  platformType?: PlatformType;
  originalName?: string;
  size?: number;
  createdAt?: Date;
  updatedAt?: Date;

  static fromEntity(entity: MediaItemEntity): MediaItemDto {
    return {
      id: entity.id,
      title: entity.title,
      description: entity.description,
      mediaType: entity.mediaType,
      // O campo da entidade é `uploadType`; `type` não existe e a chave saía sempre `undefined`.
      typeUpload: entity.uploadType,
      url: entity.url,
      isLocalFile: entity.isLocalFile,
      platformType: entity.platformType ?? undefined,
      originalName: entity.originalName,
      size: entity.size,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }
}

export class MeditationDayDto {
  id: string;
  day: WeekDay;
  verse: string;
  topic: string;
  createdAt: Date;
  updatedAt: Date;

  static fromEntity(entity: DayEntity): MeditationDayDto {
    return {
      id: entity.id,
      day: entity.day,
      verse: entity.verse,
      topic: entity.topic,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }
}

export class MeditationDto {
  id: string;
  topic: string;
  startDate: Date;
  endDate: Date;
  days: MeditationDayDto[];
  media: MediaItemDto | null;
  createdAt: Date;
  updatedAt: Date;

  static fromEntity(
    meditation: MeditationEntity,
    media: MediaItemEntity | null,
  ): MeditationDto {
    return {
      id: meditation.id,
      topic: meditation.topic,
      startDate: meditation.startDate,
      endDate: meditation.endDate,
      createdAt: meditation.createdAt,
      updatedAt: meditation.updatedAt,
      days: (meditation.days ?? []).map((day) =>
        MeditationDayDto.fromEntity(day),
      ),
      media: media ? MediaItemDto.fromEntity(media) : null,
    };
  }
}

export class WeekMeditationResponseDto {
  status: string;
  meditation: MeditationDto | null;

  static success(
    meditation: MeditationEntity,
    media: MediaItemEntity | null,
  ): WeekMeditationResponseDto {
    return {
      status: "Meditação da Semana",
      meditation: MeditationDto.fromEntity(meditation, media),
    };
  }

  static notFound(): WeekMeditationResponseDto {
    return {
      status: "Meditação não encontrada",
      meditation: null,
    };
  }
}
