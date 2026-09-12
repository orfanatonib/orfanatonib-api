import { Type } from "class-transformer";
import {
  IsArray,
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
} from "class-validator";

import { IdeasSectionMediaItemDto } from "./ideas-section-media-item.dto";

export class CreateIdeasSectionDto {
  @IsString({ message: 'O campo "title" deve ser uma string.' })
  @IsNotEmpty({ message: 'O campo "title" é obrigatório.' })
  title!: string;

  @IsString({ message: 'O campo "description" deve ser uma string.' })
  @IsNotEmpty({ message: 'O campo "description" é obrigatório.' })
  description!: string;

  @IsOptional()
  @IsBoolean({ message: 'O campo "public" deve ser booleano.' })
  public?: boolean;

  @IsOptional()
  @IsArray({ message: 'O campo "medias" deve ser um array.' })
  @ValidateNested({ each: true })
  @Type(() => IdeasSectionMediaItemDto)
  medias?: IdeasSectionMediaItemDto[];
}
