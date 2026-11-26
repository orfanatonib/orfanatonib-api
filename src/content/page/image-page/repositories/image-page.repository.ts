import { Injectable } from "@nestjs/common";
import { DataSource, In, Repository } from "typeorm";
import { ImagePageEntity } from "../entities/image-page.entity";
import {
  PageListQueryDto,
  PageListResult,
  applyPageListFilters,
  applyPageListOrder,
  applyPageWindow,
  sortByIds,
} from "../../page-list-query";
import { isPaginated } from "src/shared/list-query/list-query.util";

@Injectable()
export class ImagePageRepository extends Repository<ImagePageEntity> {
  constructor(private readonly dataSource: DataSource) {
    super(ImagePageEntity, dataSource.createEntityManager());
  }

  async findByIdWithSections(id: string): Promise<ImagePageEntity | null> {
    return this.findOne({
      where: { id },
      order: { createdAt: "ASC" },
      relations: ["sections"],
    });
  }

  async findById(id: string): Promise<ImagePageEntity | null> {
    return this.findOne({
      where: { id },
    });
  }

  /**
   * Galerias filtradas, ordenadas e paginadas no banco. Primeiro só os ids da janela;
   * seções (e a rota eager) são carregadas apenas para eles.
   */
  async findListWithSections(
    query: PageListQueryDto,
    includeNonPublic: boolean,
  ): Promise<PageListResult<ImagePageEntity>> {
    const columns = {
      title: "name",
      search: ["name", "description"],
      publicColumn: true,
    };
    const filtered = applyPageListFilters(
      this.createQueryBuilder("page"),
      "page",
      columns,
      query,
      includeNonPublic,
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
      relations: ["sections"],
    });
    return { items: sortByIds(items, ids), total };
  }

  async upsertGallery(
    data: Partial<ImagePageEntity>,
  ): Promise<ImagePageEntity> {
    if (data.id) {
      const existing = await this.preload(data);
      if (!existing) {
        throw new Error(
          `Galeria com id=${data.id} não encontrada para atualização`,
        );
      }
      return this.save(existing);
    }
    const created = this.create(data);
    return this.save(created);
  }
}
