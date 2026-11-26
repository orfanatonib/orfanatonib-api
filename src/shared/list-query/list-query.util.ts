import { SortOrder } from "../enums/sort-order.enum";
import {
  PaginatedResponseDto,
  PaginationMetaDto,
} from "../dto/paginated-response.dto";
import { ListQueryDto, LIST_QUERY_DEFAULT_LIMIT } from "./list-query.dto";

/** Escapa `%`, `_` e `\` para a busca por trecho não virar curinga. */
export function escapeLike(term: string): string {
  return term.replace(/[\\%_]/g, (char) => `\\${char}`);
}

/** Termo de busca aparado, ou `undefined` quando vazio. */
export function normalizeSearch(search?: string): string | undefined {
  const trimmed = search?.trim();
  return trimmed ? trimmed : undefined;
}

/**
 * Limites do intervalo de criação, SEMPRE no fuso local do servidor (o mesmo em que o banco grava
 * `createdAt`): `[from 00:00:00.000, to 23:59:59.999]`. "Criado a partir de 22/11" é o dia 22 de quem
 * usa o sistema (Manaus), nunca o dia UTC. Um instante sem sufixo de fuso é lido como local.
 */
export function createdRange(query: ListQueryDto): {
  from?: Date;
  to?: Date;
} {
  const from = query.createdFrom
    ? new Date(`${query.createdFrom.slice(0, 10)}T00:00:00.000`)
    : undefined;
  const to = query.createdTo
    ? new Date(`${query.createdTo.slice(0, 10)}T23:59:59.999`)
    : undefined;
  return { from, to };
}

/** `true` quando o cliente pediu paginação (enviou `page`). */
export function isPaginated(query?: ListQueryDto): boolean {
  return query?.page !== undefined;
}

/** `skip`/`take` da página pedida (limite padrão quando só `page` foi enviado). */
export function pageWindow(query: ListQueryDto): {
  skip: number;
  take: number;
  page: number;
  limit: number;
} {
  const page = query.page ?? 1;
  const limit = query.limit ?? LIST_QUERY_DEFAULT_LIMIT;
  return { skip: (page - 1) * limit, take: limit, page, limit };
}

export function buildMeta(
  query: ListQueryDto,
  totalItems: number,
  orderBy?: string,
): PaginationMetaDto {
  const { page, limit } = pageWindow(query);
  return {
    page,
    limit,
    totalItems,
    totalPages: Math.max(1, Math.ceil(totalItems / limit)),
    orderBy,
    order: query.order ?? SortOrder.DESC,
  };
}

/** Envelope `{ data, meta }` da página já recortada no banco. */
export function toPaginated<T>(
  data: T[],
  query: ListQueryDto,
  totalItems: number,
  orderBy?: string,
): PaginatedResponseDto<T> {
  return { data, meta: buildMeta(query, totalItems, orderBy) };
}
