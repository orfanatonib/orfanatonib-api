import { Injectable } from "@nestjs/common";
import { ResourceNotFoundException } from "src/common/exceptions";
import { PaginatedResponseDto } from "src/shared/dto/paginated-response.dto";
import { ShelteredRepository } from "../repositories/sheltered.repository";
import { QueryShelteredDto } from "../dto/query-sheltered.dto";
import { QueryShelteredSimpleDto } from "../dto/query-sheltered-simple.dto";
import {
  ShelteredListItemDto,
  ShelteredResponseDto,
} from "../dto/sheltered-response.dto";
import { ShelteredEntity } from "../entities/sheltered.entity";
import {
  toShelteredListItemDto,
  toShelteredResponseDto,
} from "../mappers/sheltered.mapper";
import { ShelteredAccessContext } from "../types";
import { SHELTERED_MESSAGES } from "../constants";

@Injectable()
export class GetShelteredService {
  constructor(private readonly shelteredRepository: ShelteredRepository) {}

  async findAll(
    query: QueryShelteredDto,
    actor: ShelteredAccessContext,
  ): Promise<PaginatedResponseDto<ShelteredResponseDto>> {
    const { items, total } = await this.shelteredRepository.findAllPaginated(
      query,
      actor,
    );

    return {
      data: items.map(toShelteredResponseDto),
      meta: {
        page: query.page,
        limit: query.limit,
        totalItems: total,
        totalPages: Math.ceil(total / query.limit),
        orderBy: query.orderBy,
        order: query.order,
      },
    };
  }

  async findAllSimple(
    query: QueryShelteredSimpleDto,
    actor: ShelteredAccessContext,
  ): Promise<PaginatedResponseDto<ShelteredListItemDto>> {
    const { items, total } = await this.shelteredRepository.findAllSimple(
      {
        page: query.page,
        limit: query.limit,
        searchString: query.searchString,
        acceptedJesus: query.acceptedJesus,
        active: query.active,
      },
      actor,
    );

    return {
      data: items.map(toShelteredListItemDto),
      meta: {
        page: query.page,
        limit: query.limit,
        totalItems: total,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }

  async findOne(
    id: string,
    actor: ShelteredAccessContext,
  ): Promise<ShelteredResponseDto> {
    return toShelteredResponseDto(await this.findEntityOrFail(id, actor));
  }

  /**
   * Shared lookup for the write services: resolves the record already narrowed
   * to the actor scope, so an out-of-scope id is indistinguishable from a
   * missing one.
   */
  async findEntityOrFail(
    id: string,
    actor: ShelteredAccessContext,
  ): Promise<ShelteredEntity> {
    const entity = await this.shelteredRepository.findOneForResponse(id, actor);
    if (!entity) {
      throw new ResourceNotFoundException(SHELTERED_MESSAGES.NOT_FOUND, { id });
    }
    return entity;
  }
}
