import { IsInt, IsOptional, Max, Min } from "class-validator";
import { PagelaFiltersDto } from "./pagela-filters.dto";
import { Type } from "class-transformer";

export class PaginationQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  limit?: number = 20;
}

/**
 * Query da listagem paginada de pagelas: filtros + página. É uma CLASSE (não a interseção de tipos) para o
 * ValidationPipe global enxergá-la: sem isso `sortBy`, datas e `page` chegavam sem validação nenhuma.
 */
export class PagelaPaginatedQueryDto extends PagelaFiltersDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  limit?: number = 20;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}

export class Paginated<T> implements PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;

  constructor(items: T[], total: number, page: number, limit: number) {
    this.items = items;
    this.total = total;
    this.page = page;
    this.limit = limit;
  }
}
