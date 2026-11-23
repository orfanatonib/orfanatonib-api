import { IsEnum, IsOptional } from "class-validator";
import { ListQueryDto } from "src/shared/list-query/list-query.dto";
import { IdeasSectionMediaType } from "../enums/ideas-section-media-type.enum";
import { IdeasSectionSortBy } from "../enums/ideas-section-sort-by.enum";

/** Fila de ideias compartilhadas: busca (título, descrição, autor), tipo de mídia e datas. */
export class IdeasSectionListQueryDto extends ListQueryDto {
  /** Só ideias que têm ao menos uma mídia desse tipo. */
  @IsOptional()
  @IsEnum(IdeasSectionMediaType, {
    message: "mediaType deve ser image, video ou document",
  })
  mediaType?: IdeasSectionMediaType;

  @IsOptional()
  @IsEnum(IdeasSectionSortBy, { message: "sortBy deve ser createdAt ou title" })
  sortBy?: IdeasSectionSortBy;
}
