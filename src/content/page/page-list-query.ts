import { IsEnum, IsOptional } from "class-validator";
import type { ObjectLiteral, SelectQueryBuilder } from "typeorm";
import { SortOrder } from "src/shared/enums/sort-order.enum";
import { PublicFilterQueryDto } from "src/shared/list-query/list-query.dto";
import {
  createdRange,
  escapeLike,
  isPaginated,
  normalizeSearch,
  pageWindow,
} from "src/shared/list-query/list-query.util";
import type { ListQueryDto } from "src/shared/list-query/list-query.dto";

/** Chaves de ordenação aceitas pelas listagens de páginas (galerias, vídeos e ideias). */
export enum PageSortBy {
  CREATED_AT = "createdAt",
  TITLE = "title",
}

/** Filtros de GET /image-pages e /video-pages: busca, `public`, período de criação, ordenação e página. */
export class PageListQueryDto extends PublicFilterQueryDto {
  @IsOptional()
  @IsEnum(PageSortBy, { message: "sortBy deve ser createdAt ou title" })
  sortBy?: PageSortBy;
}

export interface PageListColumns {
  /** Coluna do título no banco (`name` em galerias e vídeos, `title` em ideias). */
  title: string;
  /** Colunas varridas pela busca por texto. */
  search: string[];
  /** Só aplica `public` quando a entidade realmente usa a coluna (ideias é sempre privada). */
  publicColumn?: boolean;
}

/**
 * Aplica no banco busca, visibilidade, `public` e período. `includeNonPublic=false`
 * (visitante) trava em `public = true`: o filtro `public=false` dele devolve vazio.
 */
export function applyPageListFilters<TEntity extends ObjectLiteral>(
  qb: SelectQueryBuilder<TEntity>,
  alias: string,
  columns: PageListColumns,
  query: ListQueryDto & { public?: boolean },
  includeNonPublic: boolean,
): SelectQueryBuilder<TEntity> {
  if (columns.publicColumn) {
    if (!includeNonPublic)
      qb.andWhere(`${alias}.public = :visiblePublic`, { visiblePublic: true });
    if (query.public !== undefined)
      qb.andWhere(`${alias}.public = :filterPublic`, {
        filterPublic: query.public,
      });
  }

  const search = normalizeSearch(query.search);
  if (search) {
    const clause = columns.search
      .map((column) => `${alias}.${column} LIKE :search ESCAPE '\\\\'`)
      .join(" OR ");
    qb.andWhere(`(${clause})`, { search: `%${escapeLike(search)}%` });
  }

  const { from, to } = createdRange(query);
  if (from)
    qb.andWhere(`${alias}.createdAt >= :createdFrom`, { createdFrom: from });
  if (to) qb.andWhere(`${alias}.createdAt <= :createdTo`, { createdTo: to });
  return qb;
}

/**
 * Ordenação: sem `sortBy` e sem `page` mantém a ordem legada (`id ASC`); com `page`
 * o padrão é `createdAt` (`DESC` se `order` não vier). `id` desempata sempre.
 */
export function applyPageListOrder<TEntity extends ObjectLiteral>(
  qb: SelectQueryBuilder<TEntity>,
  alias: string,
  titleColumn: string,
  query: PageListQueryDto,
): SelectQueryBuilder<TEntity> {
  if (!query.sortBy && !isPaginated(query))
    return qb.orderBy(`${alias}.id`, "ASC");
  const column = query.sortBy === PageSortBy.TITLE ? titleColumn : "createdAt";
  return qb
    .orderBy(`${alias}.${column}`, query.order ?? SortOrder.DESC)
    .addOrderBy(`${alias}.id`, "ASC");
}

/** Recorta a janela só quando o cliente pediu `page`. */
export function applyPageWindow<TEntity extends ObjectLiteral>(
  qb: SelectQueryBuilder<TEntity>,
  query: PageListQueryDto,
): SelectQueryBuilder<TEntity> {
  if (!isPaginated(query)) return qb;
  const { skip, take } = pageWindow(query);
  return qb.offset(skip).limit(take);
}

/** `orderBy` informado no `meta` da página. */
export const pageOrderBy = (query: PageListQueryDto): string =>
  query.sortBy ?? PageSortBy.CREATED_AT;

/** Reordena `items` na ordem de `ids` (o `IN (...)` não preserva a ordem da janela). */
export function sortByIds<TItem extends { id: string }>(
  items: TItem[],
  ids: string[],
): TItem[] {
  const byId = new Map(items.map((item) => [item.id, item]));
  return ids.flatMap((id) => {
    const item = byId.get(id);
    return item ? [item] : [];
  });
}

/** Resultado do repositório: itens da janela e total já com os filtros. */
export interface PageListResult<TEntity> {
  items: TEntity[];
  total: number;
}
