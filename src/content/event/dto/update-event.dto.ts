import { EventAudience } from '../entities/event.entity';
import { IsEnum, IsOptional } from 'class-validator';

export class UpdateEventDto {
  @IsOptional()
  id?: string;

  @IsOptional()
  title?: string;

  @IsOptional()
  description?: string;

  @IsOptional()
  date?: string;

  @IsOptional()
  location?: string;

  @IsEnum(EventAudience)
  @IsOptional()
  audience?: EventAudience;

  @IsOptional()
  media?: Record<string, any>;
}
