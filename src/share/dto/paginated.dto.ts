export class Paginated<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  pageCount: number;

  constructor(items: T[], total: number, page: number, limit: number) {
    this.items = items;
    this.total = total;
    this.page = page;
    this.limit = limit;
    this.pageCount = Math.ceil(total / limit);
  }
}
