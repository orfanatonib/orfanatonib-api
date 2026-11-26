/**
 * Envelope paginado dos abrigos. Difere do `PaginatedResponseDto` compartilhado
 * (`data`/`meta`) porque este é o contrato que o frontend já consome; trocá-lo
 * quebraria a tela de abrigos. A convergência está registrada como débito.
 */
export class ShelterPaginatedResponseDto<TItem> {
  items: TItem[];
  total: number;
  page: number;
  limit: number;
  pageCount: number;
}
