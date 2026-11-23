import { IsEnum, IsOptional } from "class-validator";
import { ListQueryDto } from "src/shared/list-query/list-query.dto";
import { PageSortBy } from "../../page-list-query";

/** Filtros de GET /ideas-pages (sempre privada: não há `public`). */
export class IdeasPageListQueryDto extends ListQueryDto {
  @IsOptional()
  @IsEnum(PageSortBy, { message: "sortBy deve ser createdAt ou title" })
  sortBy?: PageSortBy;
}
