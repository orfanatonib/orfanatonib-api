import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { DeepPartial, Repository } from "typeorm";
import { SortOrder } from "src/shared/enums/sort-order.enum";
import {
  createdRange,
  escapeLike,
  isPaginated,
  normalizeSearch,
  pageWindow,
} from "src/shared/list-query/list-query.util";
import { MeditationPeriod } from "./enums/meditation-period.enum";
import { MeditationSortBy } from "./enums/meditation-sort-by.enum";
import { todayLocalIso } from "./utils/meditation-filters.util";
import { MeditationEntity } from "./entities/meditation.entity";
import { QueryMeditationDto } from "./dto/query-meditation.dto";

@Injectable()
export class MeditationRepository {
  constructor(
    @InjectRepository(MeditationEntity)
    private readonly repo: Repository<MeditationEntity>,
  ) {}

  async findOneWithRelations(id: string): Promise<MeditationEntity | null> {
    return this.repo.findOne({
      where: { id },
      relations: ["days"],
    });
  }

  async findAllWithRelations(
    query?: QueryMeditationDto,
  ): Promise<MeditationEntity[]> {
    return (await this.findFiltered(query)).items;
  }

  /** Filtros, ordenação e (com `page`) recorte da página, tudo no banco. */
  async findFiltered(
    query: QueryMeditationDto = {},
    today: string = todayLocalIso(),
  ): Promise<{ items: MeditationEntity[]; total: number }> {
    const qb = this.repo
      .createQueryBuilder("m")
      .leftJoinAndSelect("m.days", "days");

    const search = normalizeSearch(query.search);
    if (search) {
      qb.andWhere("m.topic LIKE :search ESCAPE '\\\\'", {
        search: `%${escapeLike(search)}%`,
      });
    }

    if (query.period === MeditationPeriod.CURRENT) {
      qb.andWhere("m.startDate <= :today AND m.endDate >= :today", { today });
    } else if (query.period === MeditationPeriod.UPCOMING) {
      qb.andWhere("m.startDate > :today", { today });
    } else if (query.period === MeditationPeriod.PAST) {
      qb.andWhere("m.endDate < :today", { today });
    }

    if (query.startFrom) {
      qb.andWhere("m.startDate >= :startFrom", {
        startFrom: query.startFrom.slice(0, 10),
      });
    }
    if (query.startTo) {
      qb.andWhere("m.startDate <= :startTo", {
        startTo: query.startTo.slice(0, 10),
      });
    }

    const { from, to } = createdRange(query);
    if (from) qb.andWhere("m.createdAt >= :createdFrom", { createdFrom: from });
    if (to) qb.andWhere("m.createdAt <= :createdTo", { createdTo: to });

    const paginated = isPaginated(query);
    // Legado (sem `page` e sem `sortBy`): startDate ASC, como sempre foi.
    const column = query.sortBy ?? MeditationSortBy.START_DATE;
    const direction =
      query.order ??
      (paginated || query.sortBy ? SortOrder.DESC : SortOrder.ASC);
    qb.orderBy(`m.${column}`, direction).addOrderBy("m.id", "ASC");

    if (paginated) {
      const { skip, take } = pageWindow(query);
      qb.skip(skip).take(take);
    }

    const [items, total] = await qb.getManyAndCount();
    return { items, total };
  }

  create(data: DeepPartial<MeditationEntity>): MeditationEntity {
    return this.repo.create(data);
  }

  async save(entity: DeepPartial<MeditationEntity>): Promise<MeditationEntity> {
    const created = this.repo.create(entity);
    return this.repo.save(created);
  }

  async remove(entity: MeditationEntity): Promise<MeditationEntity> {
    return this.repo.remove(entity);
  }

  async delete(id: string): Promise<void> {
    await this.repo.delete(id);
  }
}
