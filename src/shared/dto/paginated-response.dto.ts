import { SortOrder } from "../enums/sort-order.enum";

export class PaginationMetaDto {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
  orderBy?: string;
  order?: SortOrder;
}

export class PaginatedResponseDto<TItem> {
  data: TItem[];
  meta: PaginationMetaDto;
}
