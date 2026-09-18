import { Injectable } from "@nestjs/common";
import { PagelasRepository } from "../pagelas.repository";
import { PagelaResponseDto } from "../dto/pagela-response.dto";
import { PagelaFiltersDto } from "../dto/pagela-filters.dto";
import { PaginatedResponse } from "../dto/paginated.dto";

@Injectable()
export class GetPagelasService {
  constructor(private readonly repo: PagelasRepository) {}

  async findAllSimple(
    filters?: PagelaFiltersDto,
  ): Promise<PagelaResponseDto[]> {
    const items = await this.repo.findAllSimple(filters);
    return items.map(PagelaResponseDto.fromEntity);
  }

  async findAllPaginated(
    filters: PagelaFiltersDto | undefined,
    page: number,
    limit: number,
  ): Promise<PaginatedResponse<PagelaResponseDto>> {
    const { items, total } = await this.repo.findAllPaginated(
      filters,
      page,
      limit,
    );
    return {
      items: items.map(PagelaResponseDto.fromEntity),
      total,
      page,
      limit,
    };
  }

  async findOne(id: string): Promise<PagelaResponseDto> {
    const item = await this.repo.findOneOrFail(id);
    return PagelaResponseDto.fromEntity(item);
  }
}
