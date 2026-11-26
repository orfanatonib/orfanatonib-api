import { IsOptional, IsString, IsEnum } from "class-validator";
import { ListQueryDto } from "src/shared/list-query/list-query.dto";
import { AttendableType } from "../entities/attendable-type.enum";
import { AtendenteSortBy } from "../enums/atendente-sort-by.enum";
import { AtendenteDocumentsFilter } from "../enums/atendente-documents-filter.enum";

/**
 * Filtros de `GET /antecedentes-criminais`: busca (nome do cadastro ou de quem é atendido), vínculo,
 * situação dos PDFs, datas de criação, ordenação e página. Esta rota sempre foi paginada
 * (`{ data, total, page, limit, totalPages }`), então `page`/`limit` têm padrão.
 */
export class QueryAtendenteDto extends ListQueryDto {
  // Os validadores de `page` e `limit` (inteiro, mínimo 1, limite máximo) vêm de `ListQueryDto`.
  override page?: number = 1;

  override limit?: number = 10;

  @IsOptional()
  @IsEnum(AttendableType)
  attendableType?: AttendableType;

  @IsOptional()
  @IsString()
  attendableId?: string;

  @IsOptional()
  @IsEnum(AtendenteDocumentsFilter, {
    message: "documents deve ser complete, only_estadual ou only_federal",
  })
  documents?: AtendenteDocumentsFilter;

  @IsOptional()
  @IsEnum(AtendenteSortBy, {
    message: "sortBy deve ser createdAt, updatedAt ou name",
  })
  sortBy?: AtendenteSortBy;
}
