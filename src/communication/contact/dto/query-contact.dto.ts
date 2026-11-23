import { IsEnum, IsOptional } from "class-validator";
import { ReadFilterQueryDto } from "src/shared/list-query/read-filter-query.dto";
import { ContactSortBy } from "../enums/contact-sort-by.enum";

/** Filtros de `GET /contact`: busca, lido/não lido, datas de criação, ordenação e página. */
export class QueryContactDto extends ReadFilterQueryDto {
  @IsOptional()
  @IsEnum(ContactSortBy, { message: "sortBy deve ser createdAt ou name" })
  sortBy?: ContactSortBy;
}
