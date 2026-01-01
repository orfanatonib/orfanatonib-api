export class EventResponseDto {
  id!: string;
  title!: string;
  description?: string;
  date!: string;
  location?: string;
  audience?: string;

  static fromEntity(entity: any, media?: any) {
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
