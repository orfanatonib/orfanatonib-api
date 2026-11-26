import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { ILike, Repository } from "typeorm";
import { InformativeEntity } from "./entities/informative.entity";
import { RouteEntity } from "src/infrastructure/route/route-page.entity";
import { QueryInformativeDto } from "./dto/query-informative.dto";
import { SortOrder } from "src/shared/enums/sort-order.enum";
import {
  createdRange,
  escapeLike,
  isPaginated,
  normalizeSearch,
  pageWindow,
} from "src/shared/list-query/list-query.util";
import { InformativeSortBy } from "./enums/informative-sort-by.enum";

@Injectable()
export class InformativeRepository {
  constructor(
    @InjectRepository(InformativeEntity)
    private readonly repo: Repository<InformativeEntity>,
  ) {}

  async findPublic(query?: QueryInformativeDto): Promise<InformativeEntity[]> {
    const search = query?.search?.trim();
    if (search) {
      return this.repo.find({
        where: [
          { public: true, title: ILike(`%${search}%`) },
          { public: true, description: ILike(`%${search}%`) },
        ],
        order: { createdAt: "DESC" },
      });
    }

    return this.repo.find({
      where: { public: true },
      order: { createdAt: "DESC" },
    });
  }

  async findAllSorted(
    query?: QueryInformativeDto,
  ): Promise<InformativeEntity[]> {
    return (await this.findFiltered(query)).items;
  }

  /** Filtros, ordenação e (com `page`) recorte da página, tudo no banco. */
  async findFiltered(
    query: QueryInformativeDto = {},
  ): Promise<{ items: InformativeEntity[]; total: number }> {
    const qb = this.repo.createQueryBuilder("i");

    const search = normalizeSearch(query.search);
    if (search) {
      qb.andWhere(
        "(i.title LIKE :search ESCAPE '\\\\' OR i.description LIKE :search ESCAPE '\\\\')",
        { search: `%${escapeLike(search)}%` },
      );
    }

    if (query.public !== undefined) {
      qb.andWhere("i.public = :isPublic", { isPublic: query.public });
    }

    const { from, to } = createdRange(query);
    if (from) qb.andWhere("i.createdAt >= :createdFrom", { createdFrom: from });
    if (to) qb.andWhere("i.createdAt <= :createdTo", { createdTo: to });

    const column = query.sortBy ?? InformativeSortBy.CREATED_AT;
    qb.orderBy(`i.${column}`, query.order ?? SortOrder.DESC).addOrderBy(
      "i.id",
      "ASC",
    );

    if (isPaginated(query)) {
      const { skip, take } = pageWindow(query);
      qb.skip(skip).take(take);
    }

    const [items, total] = await qb.getManyAndCount();
    return { items, total };
  }

  async findOneWithRelations(id: string): Promise<InformativeEntity | null> {
    return this.repo.findOne({
      where: { id },
      relations: ["route"],
    });
  }

  async findOneById(id: string): Promise<InformativeEntity | null> {
    return this.repo.findOne({ where: { id }, relations: ["route"] });
  }

  async save(entity: Partial<InformativeEntity>): Promise<InformativeEntity> {
    const created = this.repo.create(entity);
    return this.repo.save(created);
  }

  async remove(entity: InformativeEntity): Promise<InformativeEntity> {
    return this.repo.remove(entity);
  }

  /** Banner e rota saem juntos: se um dos dois falhar, nenhum sai. O banner guarda a chave da rota, então sai primeiro. */
  async removeWithRoute(entity: InformativeEntity): Promise<void> {
    const routeId = entity.route?.id;
    await this.repo.manager.transaction(async (manager) => {
      await manager.remove(InformativeEntity, entity);
      if (routeId) await manager.delete(RouteEntity, routeId);
    });
  }
}
