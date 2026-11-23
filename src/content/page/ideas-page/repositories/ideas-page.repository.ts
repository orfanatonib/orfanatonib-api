import { Injectable } from "@nestjs/common";
import { DataSource, EntityManager, In, Repository } from "typeorm";
import { IdeasPageEntity } from "../entities/ideas-page.entity";
import {
  PageListResult,
  applyPageListFilters,
  applyPageListOrder,
  applyPageWindow,
  sortByIds,
} from "../../page-list-query";
import { IdeasPageListQueryDto } from "../dto/ideas-page-list-query.dto";
import { isPaginated } from "src/shared/list-query/list-query.util";

@Injectable()
export class IdeasPageRepository extends Repository<IdeasPageEntity> {
  constructor(private readonly dataSource: DataSource) {
    super(IdeasPageEntity, dataSource.createEntityManager());
  }

  async findAllPages(): Promise<IdeasPageEntity[]> {
    return this.find({ relations: ["route"] });
  }

  async findOnePageById(id: string): Promise<IdeasPageEntity | null> {
    return this.findOne({
      where: { id },
      relations: ["route", "sections", "sections.user"],
    });
  }

  async savePage(page: IdeasPageEntity): Promise<IdeasPageEntity> {
    return this.save(page);
  }

  async removePage(page: IdeasPageEntity): Promise<IdeasPageEntity> {
    return this.remove(page);
  }

  async upsertPage(
    id: string | undefined,
    pageData: Partial<IdeasPageEntity>,
  ): Promise<IdeasPageEntity> {
    if (id) {
      const existing = await this.findOnePageById(id);
      if (existing) {
        Object.assign(existing, pageData);
        return this.save(existing);
      }
    }
    const created = this.create(pageData);
    return this.save(created);
  }

  async removePageWithManager(
    manager: EntityManager,
    page: IdeasPageEntity,
  ): Promise<IdeasPageEntity> {
    return manager.remove(page);
  }

  async findAllPagesWithSections(): Promise<IdeasPageEntity[]> {
    return this.find({ relations: ["route", "sections", "sections.user"] });
  }

  /**
   * Páginas de ideias filtradas, ordenadas e paginadas no banco; seções, autores e rota
   * são carregados só para os ids da janela. Sempre privada: não há filtro `public`.
   */
  async findListWithSections(
    query: IdeasPageListQueryDto,
  ): Promise<PageListResult<IdeasPageEntity>> {
    const columns = {
      title: "title",
      search: ["title", "subtitle", "description"],
    };
    const filtered = applyPageListFilters(
      this.createQueryBuilder("page"),
      "page",
      columns,
      query,
      true,
    );
    const idsQuery = applyPageWindow(
      applyPageListOrder(
        filtered.clone().select("page.id"),
        "page",
        columns.title,
        query,
      ),
      query,
    );
    const ids = (await idsQuery.getMany()).map((row) => row.id);
    const total = isPaginated(query) ? await filtered.getCount() : ids.length;
    if (ids.length === 0) return { items: [], total };
    const items = await this.find({
      where: { id: In(ids) },
      relations: ["route", "sections", "sections.user"],
    });
    return { items: sortByIds(items, ids), total };
  }
}
