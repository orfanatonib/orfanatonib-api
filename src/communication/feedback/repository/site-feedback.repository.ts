import { Injectable } from "@nestjs/common";
import { DataSource, Repository } from "typeorm";
import { SiteFeedbackEntity } from "../entity/site-feedback.entity";
import { CreateSiteFeedbackDto } from "../dto/create-site-feedback.dto";
import { QuerySiteFeedbackDto } from "../dto/query-site-feedback.dto";
import { SiteFeedbackSortBy } from "../enums/site-feedback-sort-by.enum";
import { SortOrder } from "src/shared/enums/sort-order.enum";
import {
  createdRange,
  escapeLike,
  isPaginated,
  normalizeSearch,
  pageWindow,
} from "src/shared/list-query/list-query.util";

@Injectable()
export class SiteFeedbackRepository extends Repository<SiteFeedbackEntity> {
  constructor(private readonly dataSource: DataSource) {
    super(SiteFeedbackEntity, dataSource.createEntityManager());
  }

  async createAndSave(dto: CreateSiteFeedbackDto): Promise<SiteFeedbackEntity> {
    const feedback = this.create(dto);
    return this.save(feedback);
  }

  /** Filtros, ordenação e (com `page`) recorte da página, tudo no banco. */
  async findFiltered(
    query: QuerySiteFeedbackDto = {},
  ): Promise<{ items: SiteFeedbackEntity[]; total: number }> {
    const qb = this.createQueryBuilder("f");

    const search = normalizeSearch(query.search);
    if (search) {
      qb.andWhere(
        "(f.name LIKE :search ESCAPE '\\\\' OR f.email LIKE :search ESCAPE '\\\\' OR f.comment LIKE :search ESCAPE '\\\\')",
        { search: `%${escapeLike(search)}%` },
      );
    }

    if (query.read !== undefined) {
      qb.andWhere("f.read = :read", { read: query.read });
    }
    if (query.category) {
      qb.andWhere("f.category = :category", { category: query.category });
    }
    if (query.rating !== undefined) {
      qb.andWhere("f.rating = :rating", { rating: query.rating });
    }

    const { from, to } = createdRange(query);
    if (from) qb.andWhere("f.createdAt >= :createdFrom", { createdFrom: from });
    if (to) qb.andWhere("f.createdAt <= :createdTo", { createdTo: to });

    const column = query.sortBy ?? SiteFeedbackSortBy.CREATED_AT;
    qb.orderBy(`f.${column}`, query.order ?? SortOrder.DESC).addOrderBy(
      "f.id",
      "ASC",
    );

    if (isPaginated(query)) {
      const { skip, take } = pageWindow(query);
      qb.skip(skip).take(take);
    }

    const [items, total] = await qb.getManyAndCount();
    return { items, total };
  }

  /** Feedbacks que o admin ainda não marcou como lidos. */
  async countUnread(): Promise<number> {
    return this.countBy({ read: false });
  }

  async findById(id: string): Promise<SiteFeedbackEntity | null> {
    return this.findOneBy({ id });
  }

  async updateAndSave(
    entity: SiteFeedbackEntity,
    dto: CreateSiteFeedbackDto,
  ): Promise<SiteFeedbackEntity> {
    Object.assign(entity, dto);
    return this.save(entity);
  }

  async removeFeedback(entity: SiteFeedbackEntity): Promise<void> {
    await this.remove(entity);
  }
}
