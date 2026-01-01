import { EventAudience } from '../entities/event.entity';
import { IsEnum, IsNotEmpty, IsOptional } from 'class-validator';

export class CreateEventDto {
  @IsNotEmpty()
  title!: string;

  @IsNotEmpty()
  date!: string;

  @IsNotEmpty()
  location!: string;

  @IsNotEmpty()
  description?: string;

  @IsEnum(EventAudience)
  @IsNotEmpty()
  audience!: EventAudience;

  @IsOptional()
  media?: Record<string, any>;
}
