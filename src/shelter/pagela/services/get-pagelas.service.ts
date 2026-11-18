import { Injectable } from "@nestjs/common";
import { PagelasRepository } from "../pagelas.repository";
import { PagelaResponseDto } from "../dto/pagela-response.dto";
import { PagelaFiltersDto } from "../dto/pagela-filters.dto";
import { PaginatedResponse } from "../dto/paginated.dto";
import type { ShelterAccessContext } from "src/shelter/shelter/types";
import { PagelaAccessService } from "./pagela-access.service";

@Injectable()
export class GetPagelasService {
  constructor(
    private readonly repo: PagelasRepository,
    private readonly access: PagelaAccessService,
  ) {}

  async findAllSimple(
    filters?: PagelaFiltersDto,
    shelterIds?: readonly string[],
  ): Promise<PagelaResponseDto[]> {
    const items = await this.repo.findAllSimple(filters, shelterIds);
    return items.map((item) => PagelaResponseDto.fromEntity(item));
  }

  async findAllPaginated(
    filters: PagelaFiltersDto | undefined,
    page: number,
    limit: number,
    shelterIds?: readonly string[],
  ): Promise<PaginatedResponse<PagelaResponseDto>> {
    const { items, total } = await this.repo.findAllPaginated(
      filters,
      page,
      limit,
      shelterIds,
    );
    return {
      items: items.map((item) => PagelaResponseDto.fromEntity(item)),
      total,
      page,
      limit,
    };
  }

  async findOne(id: string): Promise<PagelaResponseDto> {
    const item = await this.repo.findOneOrFail(id);
    return PagelaResponseDto.fromEntity(item);
  }

  /** Entrada HTTP das listagens: restringe ao escopo do ator. */
  async findAllSimpleAs(
    actor: ShelterAccessContext,
    filters: PagelaFiltersDto,
  ): Promise<PagelaResponseDto[]> {
    const scope = await this.access.resolveListScope(
      filters.shelteredId,
      actor,
    );
    return this.findAllSimple(filters, scope);
  }

  async findAllPaginatedAs(
    actor: ShelterAccessContext,
    filters: PagelaFiltersDto | undefined,
    page: number,
    limit: number,
  ): Promise<PaginatedResponse<PagelaResponseDto>> {
    const scope = await this.access.resolveListScope(
      filters?.shelteredId,
      actor,
    );
    return this.findAllPaginated(filters, page, limit, scope);
  }

  async findOneAs(
    actor: ShelterAccessContext,
    id: string,
  ): Promise<PagelaResponseDto> {
    await this.access.assertCanAccessPagela(id, actor);
    return this.findOne(id);
  }
}
