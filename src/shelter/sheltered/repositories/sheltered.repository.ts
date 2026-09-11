import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import {
  DeepPartial,
  EntityManager,
  Repository,
  SelectQueryBuilder,
} from "typeorm";
import { UserRole } from "src/core/auth/auth.types";
import { SortOrder } from "src/shared/enums/sort-order.enum";
import { ShelteredEntity } from "../entities/sheltered.entity";
import { QueryShelteredDto } from "../dto/query-sheltered.dto";
import { AcceptedJesusFilter } from "../enums/accepted-jesus-filter.enum";
import { ShelteredActiveFilter } from "../enums/sheltered-active-filter.enum";
import {
  PaginatedRows,
  ShelteredAccessContext,
  ShelteredSimpleFilters,
} from "../types";
import { isUnscopedActor } from "../utils/sheltered-access.util";
import {
  ACCEPTED_CHRISTS_ALIAS,
  SHELTERED_ADDRESS_ALIAS,
  SHELTERED_ALIAS,
  SHELTERED_ORDER_BY_COLUMNS,
  SHELTER_ADDRESS_ALIAS,
  SHELTER_ALIAS,
} from "../constants";

@Injectable()
export class ShelteredRepository {
  constructor(
    @InjectRepository(ShelteredEntity)
    private readonly repository: Repository<ShelteredEntity>,
  ) {}

  private scopedRepository(
    manager?: EntityManager,
  ): Repository<ShelteredEntity> {
    return manager ? manager.getRepository(ShelteredEntity) : this.repository;
  }

  private baseQueryBuilder(): SelectQueryBuilder<ShelteredEntity> {
    return this.repository
      .createQueryBuilder(SHELTERED_ALIAS)
      .leftJoinAndSelect(`${SHELTERED_ALIAS}.shelter`, SHELTER_ALIAS)
      .leftJoinAndSelect(`${SHELTERED_ALIAS}.address`, SHELTERED_ADDRESS_ALIAS)
      .leftJoinAndSelect(`${SHELTER_ALIAS}.address`, SHELTER_ADDRESS_ALIAS);
  }

  /**
   * Narrows the result set to the shelters the actor belongs to.
   * Admins (and unauthenticated scopes) are never narrowed.
   */
  private applyRoleFilter(
    queryBuilder: SelectQueryBuilder<ShelteredEntity>,
    actor: ShelteredAccessContext,
  ): void {
    if (isUnscopedActor(actor)) return;

    if (actor.role === UserRole.LEADER) {
      queryBuilder
        .leftJoin(`${SHELTER_ALIAS}.teams`, "team")
        .leftJoin("team.leaders", "leader")
        .leftJoin("leader.user", "leaderUser")
        .andWhere("leaderUser.id = :actorId", { actorId: actor.userId })
        .distinct(true);
      return;
    }

    if (actor.role === UserRole.MEMBER) {
      queryBuilder
        .leftJoin(`${SHELTER_ALIAS}.teams`, "team")
        .leftJoin("team.members", "members")
        .leftJoin("members.user", "memberUser")
        .andWhere("memberUser.id = :actorId", { actorId: actor.userId })
        .distinct(true);
    }
  }

  private applyListFilters(
    queryBuilder: SelectQueryBuilder<ShelteredEntity>,
    query: QueryShelteredDto,
  ): void {
    const searchString = query.searchString?.trim();
    if (searchString) {
      queryBuilder.andWhere(
        `(
          LOWER(${SHELTERED_ALIAS}.name) LIKE LOWER(:searchString) OR
          LOWER(COALESCE(${SHELTERED_ALIAS}.guardianName, '')) LIKE LOWER(:searchString) OR
          COALESCE(${SHELTERED_ALIAS}.guardianPhone, '') LIKE :searchString
        )`,
        { searchString: `%${searchString}%` },
      );
    }

    const shelterSearchingString = query.shelterSearchingString?.trim();
    if (shelterSearchingString) {
      queryBuilder.andWhere(
        `(
          LOWER(COALESCE(${SHELTER_ALIAS}.name, '')) LIKE LOWER(:shelterSearchingString) OR
          LOWER(COALESCE(${SHELTER_ADDRESS_ALIAS}.city, '')) LIKE LOWER(:shelterSearchingString) OR
          LOWER(COALESCE(${SHELTER_ADDRESS_ALIAS}.state, '')) LIKE LOWER(:shelterSearchingString)
        )`,
        { shelterSearchingString: `%${shelterSearchingString}%` },
      );
    }

    const addressFilter = query.addressFilter?.trim();
    if (addressFilter) {
      queryBuilder.andWhere(
        `(
          LOWER(COALESCE(${SHELTERED_ADDRESS_ALIAS}.street, '')) LIKE LOWER(:addressFilter) OR
          LOWER(COALESCE(${SHELTERED_ADDRESS_ALIAS}.district, '')) LIKE LOWER(:addressFilter) OR
          LOWER(COALESCE(${SHELTERED_ADDRESS_ALIAS}.city, '')) LIKE LOWER(:addressFilter) OR
          LOWER(COALESCE(${SHELTERED_ADDRESS_ALIAS}.state, '')) LIKE LOWER(:addressFilter)
        )`,
        { addressFilter: `%${addressFilter}%` },
      );
    }

    if (query.shelterId) {
      queryBuilder.andWhere(`${SHELTER_ALIAS}.id = :shelterId`, {
        shelterId: query.shelterId,
      });
    }

    if (query.gender) {
      queryBuilder.andWhere(`${SHELTERED_ALIAS}.gender = :gender`, {
        gender: query.gender,
      });
    }

    if (query.birthDateFrom) {
      queryBuilder.andWhere(`${SHELTERED_ALIAS}.birthDate >= :birthDateFrom`, {
        birthDateFrom: query.birthDateFrom,
      });
    }

    if (query.birthDateTo) {
      queryBuilder.andWhere(`${SHELTERED_ALIAS}.birthDate <= :birthDateTo`, {
        birthDateTo: query.birthDateTo,
      });
    }

    if (query.joinedFrom) {
      queryBuilder.andWhere(`${SHELTERED_ALIAS}.joinedAt >= :joinedFrom`, {
        joinedFrom: query.joinedFrom,
      });
    }

    if (query.joinedTo) {
      queryBuilder.andWhere(`${SHELTERED_ALIAS}.joinedAt <= :joinedTo`, {
        joinedTo: query.joinedTo,
      });
    }
  }

  async findAllPaginated(
    query: QueryShelteredDto,
    actor: ShelteredAccessContext,
  ): Promise<PaginatedRows<ShelteredEntity>> {
    const queryBuilder = this.baseQueryBuilder().distinct(true);

    this.applyRoleFilter(queryBuilder, actor);
    this.applyListFilters(queryBuilder, query);

    const sortColumn = SHELTERED_ORDER_BY_COLUMNS[query.orderBy];
    const sortDirection =
      query.order === SortOrder.DESC ? SortOrder.DESC : SortOrder.ASC;

    queryBuilder
      .orderBy(sortColumn, sortDirection)
      .addOrderBy(`${SHELTERED_ALIAS}.id`, SortOrder.ASC)
      .skip((query.page - 1) * query.limit)
      .take(query.limit);

    const [items, total] = await queryBuilder.getManyAndCount();
    return { items, total };
  }

  async findAllSimple(
    filters: ShelteredSimpleFilters,
    actor: ShelteredAccessContext,
  ): Promise<PaginatedRows<ShelteredEntity>> {
    const queryBuilder = this.repository
      .createQueryBuilder(SHELTERED_ALIAS)
      .leftJoinAndSelect(`${SHELTERED_ALIAS}.shelter`, SHELTER_ALIAS)
      .leftJoinAndSelect(
        `${SHELTERED_ALIAS}.acceptedChrists`,
        ACCEPTED_CHRISTS_ALIAS,
      );

    this.applyRoleFilter(queryBuilder, actor);

    const searchString = filters.searchString?.trim();
    if (searchString) {
      queryBuilder.andWhere(
        `(
          LOWER(COALESCE(${SHELTER_ALIAS}.name, '')) LIKE LOWER(:searchString) OR
          LOWER(COALESCE(${SHELTERED_ALIAS}.guardianName, '')) LIKE LOWER(:searchString) OR
          COALESCE(${SHELTERED_ALIAS}.guardianPhone, '') LIKE :searchString
        )`,
        { searchString: `%${searchString}%` },
      );
    }

    if (filters.acceptedJesus !== AcceptedJesusFilter.ALL) {
      const operator =
        filters.acceptedJesus === AcceptedJesusFilter.ACCEPTED
          ? "EXISTS"
          : "NOT EXISTS";
      queryBuilder.andWhere(
        `${operator} (
          SELECT 1 FROM accepted_christs ac
          WHERE ac.sheltered_id = ${SHELTERED_ALIAS}.id
          AND ac.decision IN (:...decisions)
        )`,
        { decisions: ["ACCEPTED", "RECONCILED"] },
      );
    }

    if (filters.active !== ShelteredActiveFilter.ALL) {
      queryBuilder.andWhere(`${SHELTERED_ALIAS}.active = :active`, {
        active: filters.active === ShelteredActiveFilter.ACTIVE,
      });
    }

    queryBuilder
      .orderBy(`${SHELTERED_ALIAS}.active`, SortOrder.DESC)
      .addOrderBy(`${SHELTERED_ALIAS}.id`, SortOrder.ASC)
      .skip((filters.page - 1) * filters.limit)
      .take(filters.limit);

    const [items, total] = await queryBuilder.getManyAndCount();
    return { items, total };
  }

  async findOneForResponse(
    id: string,
    actor: ShelteredAccessContext,
  ): Promise<ShelteredEntity | null> {
    const queryBuilder = this.baseQueryBuilder().where(
      `${SHELTERED_ALIAS}.id = :id`,
      { id },
    );
    this.applyRoleFilter(queryBuilder, actor);
    return queryBuilder.getOne();
  }

  create(partial: DeepPartial<ShelteredEntity>): ShelteredEntity {
    return this.repository.create(partial);
  }

  save(
    entity: ShelteredEntity,
    manager?: EntityManager,
  ): Promise<ShelteredEntity> {
    return this.scopedRepository(manager).save(entity);
  }

  async deleteById(id: string, manager?: EntityManager): Promise<void> {
    await this.scopedRepository(manager).delete(id);
  }
}
