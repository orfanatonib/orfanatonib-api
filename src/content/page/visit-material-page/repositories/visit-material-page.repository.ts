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

  private baseQueryBuilder(): SelectQueryBuilder<VisitMaterialsPageEntity> {
    return this.repository
      .createQueryBuilder(PAGE_ALIAS)
      .leftJoinAndSelect(`${PAGE_ALIAS}.route`, ROUTE_ALIAS);
  }

  async findAll(
    query: QueryVisitMaterialsPageDto = {},
  ): Promise<VisitMaterialsPageEntity[]> {
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

    const searchString = query.searchString?.trim();
    if (searchString) {
      queryBuilder.andWhere(
        `(
          LOWER(${PAGE_ALIAS}.title) LIKE LOWER(:searchString) OR
          LOWER(${PAGE_ALIAS}.subtitle) LIKE LOWER(:searchString) OR
          LOWER(${PAGE_ALIAS}.description) LIKE LOWER(:searchString)
        )`,
        { searchString: `%${searchString}%` },
      );
    }

    return queryBuilder.orderBy(`${PAGE_ALIAS}.createdAt`, "DESC").getMany();
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
