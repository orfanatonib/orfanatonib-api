import type { EventEntity } from "../entities/event.entity";
import type { MediaItemEntity } from "src/shared/media/media-item/media-item.entity";

export class EventResponseDto {
  id!: string;
  title!: string;
  description?: string;
  date!: string;
  location?: string;
  audience?: string;

  static fromEntity(entity: EventEntity, media?: MediaItemEntity | null) {
    return {
      id: entity.id,
      title: entity.title,
      description: entity.description,
      date: entity.date,
      location: entity.location,
      audience: entity.audience,
      media,
    };
  }
}
