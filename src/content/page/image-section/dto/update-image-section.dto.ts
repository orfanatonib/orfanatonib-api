import {
  IsArray,
  IsBoolean,
  IsUUID,
  IsString,
  ValidateNested,
  IsOptional,
} from "class-validator";
import { Type } from "class-transformer";
import { MediaItemDto } from "src/shared/dto/media-item-dto";

export class UpdateImageSectionDto {
  @IsString({ message: 'O campo "caption" deve ser uma string.' })
  caption: string;

  @IsString({ message: 'O campo "description" deve ser uma string.' })
  description: string;

  @IsOptional()
  @IsBoolean({ message: 'O campo "public" deve ser booleano.' })
  @Type(() => Boolean)
  public: boolean = false;

  /** Galeria de destino; omitido = galeria do feed (`FEED_ORFANATO_PAGE_ID`). */
  @IsOptional()
  @IsUUID(undefined, { message: 'O campo "pageId" deve ser um UUID.' })
  pageId?: string;

  @IsArray({ message: 'O campo "mediaItems" deve ser um array.' })
  @ValidateNested({ each: true })
  @Type(() => MediaItemDto)
  mediaItems: MediaItemDto[];
}
