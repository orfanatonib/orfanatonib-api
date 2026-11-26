import type { EventMediaInput } from "./event-media-input";
import { EventAudience } from "../entities/event.entity";
import { IsDateString, IsEnum, IsNotEmpty, IsOptional } from "class-validator";

export class CreateEventDto {
  @IsNotEmpty()
  title!: string;

  // Texto livre virava lixo (`"ontem"`): o front manda a data ISO; `IsDateString` aceita data e data-hora.
  @IsNotEmpty()
  @IsDateString()
  date!: string;

  @IsNotEmpty()
  location!: string;

  @IsNotEmpty()
  description?: string;

  @IsEnum(EventAudience)
  @IsNotEmpty()
  audience!: EventAudience;

  @IsOptional()
  media?: EventMediaInput;
}
