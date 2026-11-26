import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import {
  DataSource,
  EntityManager,
  Repository,
  SelectQueryBuilder,
} from "typeorm";
import { VisitMaterialsPageEntity } from "../entities/visit-material-page.entity";
import { QueryVisitMaterialsPageDto } from "../dto/query-visit-material-pages.dto";
import { VisitMaterialSortBy } from "../enums/visit-material-sort-by.enum";
import { SortOrder } from "src/shared/enums/sort-order.enum";
import {
  createdRange,
  escapeLike,
  isPaginated,
  normalizeSearch,
  pageWindow,
} from "src/shared/list-query/list-query.util";

const PAGE_ALIAS = "page";
const ROUTE_ALIAS = "route";
const ROUTE_RELATION = ["route"];

@Injectable()
export class VisitMaterialsPageRepository {
  constructor(
    @InjectRepository(VisitMaterialsPageEntity)
    private readonly repository: Repository<VisitMaterialsPageEntity>,
    private readonly dataSource: DataSource,
  ) {}

  private scoped(
    manager?: EntityManager,
  ): Repository<VisitMaterialsPageEntity> {
    return manager
      ? manager.getRepository(VisitMaterialsPageEntity)
      : this.repository;
  }

  /**
   * Runs `work` inside a single transaction. The page and its route are written
   * together; media lives in its own module and is not part of this boundary.
   */
  runInTransaction<TResult>(
    work: (manager: EntityManager) => Promise<TResult>,
  ): Promise<TResult> {
    return this.dataSource.transaction(work);
  }

  /**
   * Trava a página até o fim da transação: edições simultâneas da mesma página se enfileiram, e a
   * segunda enxerga a mídia que a primeira acabou de gravar (sem isso as duas trocam o mesmo arquivo e
   * um objeto novo vira órfão no bucket). Devolve `false` se a página não existe mais.
   */
  async lockPage(manager: EntityManager, id: string): Promise<boolean> {
    const locked = await manager
      .createQueryBuilder(VisitMaterialsPageEntity, PAGE_ALIAS)
      .setLock("pessimistic_write")
      .where(`${PAGE_ALIAS}.id = :id`, { id })
      .getOne();
    return locked !== null;
  }

  private baseQueryBuilder(): SelectQueryBuilder<VisitMaterialsPageEntity> {
    return this.repository
      .createQueryBuilder(PAGE_ALIAS)
      .leftJoinAndSelect(`${PAGE_ALIAS}.route`, ROUTE_ALIAS);
  }

  /** Mesma consulta sem o total, para quem só quer a lista. */
  async findAll(
    query: QueryVisitMaterialsPageDto = {},
  ): Promise<VisitMaterialsPageEntity[]> {
    return (await this.findFiltered(query)).items;
  }

  /** Filtros, ordenação e (com `page`) recorte da página, tudo no banco. A rota é 1:1, sem duplicar linhas. */
  async findFiltered(
    query: QueryVisitMaterialsPageDto = {},
  ): Promise<{ items: VisitMaterialsPageEntity[]; total: number }> {
    const queryBuilder = this.baseQueryBuilder();

    if (query.testament) {
      queryBuilder.andWhere(`${PAGE_ALIAS}.testament = :testament`, {
        testament: query.testament,
      });
    }

    if (query.category) {
      queryBuilder.andWhere(
        `EXISTS (
          SELECT 1 FROM visit_material_sections section
          WHERE section.page_id = ${PAGE_ALIAS}.id AND section.category = :category
        )`,
        { category: query.category },
      );
    }

    if (query.public !== undefined) {
      queryBuilder.andWhere(`${ROUTE_ALIAS}.public = :isPublic`, {
        isPublic: query.public,
      });
    }

    if (query.currentWeek !== undefined) {
      queryBuilder.andWhere(`${PAGE_ALIAS}.currentWeek = :currentWeek`, {
        currentWeek: query.currentWeek,
      });
    }

    const searchString = normalizeSearch(query.search ?? query.searchString);
    if (searchString) {
      queryBuilder.andWhere(
        `(
          ${PAGE_ALIAS}.title LIKE :searchString ESCAPE '\\\\' OR
          ${PAGE_ALIAS}.subtitle LIKE :searchString ESCAPE '\\\\' OR
          ${PAGE_ALIAS}.description LIKE :searchString ESCAPE '\\\\'
        )`,
        { searchString: `%${escapeLike(searchString)}%` },
      );
    }

    const { from, to } = createdRange(query);
    if (from) {
      queryBuilder.andWhere(`${PAGE_ALIAS}.createdAt >= :createdFrom`, {
        createdFrom: from,
      });
    }
    if (to) {
      queryBuilder.andWhere(`${PAGE_ALIAS}.createdAt <= :createdTo`, {
        createdTo: to,
      });
    }

    const column = query.sortBy ?? VisitMaterialSortBy.CREATED_AT;
    queryBuilder
      .orderBy(`${PAGE_ALIAS}.${column}`, query.order ?? SortOrder.DESC)
      .addOrderBy(`${PAGE_ALIAS}.id`, "ASC");

    if (isPaginated(query)) {
      const { skip, take } = pageWindow(query);
      queryBuilder.skip(skip).take(take);
    }

    const [items, total] = await queryBuilder.getManyAndCount();
    return { items, total };
  }

  async findById(
    id: string,
    manager?: EntityManager,
  ): Promise<VisitMaterialsPageEntity | null> {
    return this.scoped(manager).findOne({
      where: { id },
      relations: ROUTE_RELATION,
    });
  }

  async findBySourceLessonId(
    sourceLessonId: string,
  ): Promise<VisitMaterialsPageEntity | null> {
    return this.repository.findOne({
      where: { sourceLessonId },
      relations: ROUTE_RELATION,
    });
  }

  async findCurrentWeek(): Promise<VisitMaterialsPageEntity | null> {
    return this.repository.findOne({
      where: { currentWeek: true },
      relations: ROUTE_RELATION,
    });
  }

  create(
    partial: Partial<VisitMaterialsPageEntity>,
    manager?: EntityManager,
  ): VisitMaterialsPageEntity {
    return this.scoped(manager).create(partial);
  }

  save(
    page: VisitMaterialsPageEntity,
    manager?: EntityManager,
  ): Promise<VisitMaterialsPageEntity> {
    return this.scoped(manager).save(page);
  }

  async remove(
    page: VisitMaterialsPageEntity,
    manager?: EntityManager,
  ): Promise<void> {
    await this.scoped(manager).remove(page);
  }
}
