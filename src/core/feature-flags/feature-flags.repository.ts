import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, SelectQueryBuilder } from "typeorm";

import {
  FEATURE_FLAGS_DEFAULT_LIMIT,
  FEATURE_FLAGS_DEFAULT_PAGE,
  FEATURE_FLAG_DEFAULT_ORDER,
  FEATURE_FLAG_DEFAULT_SORT,
  FEATURE_FLAG_SORT_COLUMNS,
} from "./constants";
import { QueryFeatureFlagsDto } from "./dto/query-feature-flags.dto";
import { FeatureFlagEntity } from "./entities/feature-flag.entity";

@Injectable()
export class FeatureFlagsRepository {
  constructor(
    @InjectRepository(FeatureFlagEntity)
    private readonly repository: Repository<FeatureFlagEntity>,
  ) {}

  private applyFilters(
    queryBuilder: SelectQueryBuilder<FeatureFlagEntity>,
    query: QueryFeatureFlagsDto,
  ): void {
    const search = query.searchString?.trim();
    if (search) {
      queryBuilder.andWhere(
        `(
          LOWER(flag.key) LIKE LOWER(:search) OR
          LOWER(flag.name) LIKE LOWER(:search) OR
          LOWER(flag.description) LIKE LOWER(:search)
        )`,
        { search: `%${search}%` },
      );
    }

    if (query.enabled !== undefined) {
      queryBuilder.andWhere("flag.enabled = :enabled", {
        enabled: query.enabled,
      });
    }
  }

  async findAllPaginated(
    query: QueryFeatureFlagsDto,
  ): Promise<{ items: FeatureFlagEntity[]; total: number }> {
    const page = query.page ?? FEATURE_FLAGS_DEFAULT_PAGE;
    const limit = query.limit ?? FEATURE_FLAGS_DEFAULT_LIMIT;
    const sort = query.sort ?? FEATURE_FLAG_DEFAULT_SORT;
    const order = query.order ?? FEATURE_FLAG_DEFAULT_ORDER;

    const queryBuilder = this.repository.createQueryBuilder("flag");
    this.applyFilters(queryBuilder, query);
    queryBuilder
      .orderBy(FEATURE_FLAG_SORT_COLUMNS[sort], order)
      .skip((page - 1) * limit)
      .take(limit);

    const [items, total] = await queryBuilder.getManyAndCount();
    return { items, total };
  }

  async findAllFiltered(
    query: QueryFeatureFlagsDto,
  ): Promise<FeatureFlagEntity[]> {
    const sort = query.sort ?? FEATURE_FLAG_DEFAULT_SORT;
    const order = query.order ?? FEATURE_FLAG_DEFAULT_ORDER;
    const queryBuilder = this.repository.createQueryBuilder("flag");

    this.applyFilters(queryBuilder, query);
    queryBuilder.orderBy(FEATURE_FLAG_SORT_COLUMNS[sort], order);
    return queryBuilder.getMany();
  }

  async findAll(): Promise<FeatureFlagEntity[]> {
    return this.repository.find({ order: { name: "ASC" } });
  }

  async findByKey(key: string): Promise<FeatureFlagEntity | null> {
    return this.repository.findOne({ where: { key } });
  }

  async findEnabledState(key: string): Promise<boolean | null> {
    const flag = await this.repository.findOne({ where: { key } });
    return flag?.enabled ?? null;
  }

  create(data: Partial<FeatureFlagEntity>): FeatureFlagEntity {
    return this.repository.create(data);
  }

  async save(flag: FeatureFlagEntity): Promise<FeatureFlagEntity> {
    return this.repository.save(flag);
  }

  async remove(flag: FeatureFlagEntity): Promise<void> {
    await this.repository.remove(flag);
  }
}
