import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { SortOrder } from "src/shared/enums/sort-order.enum";
import { MediaTargetType } from "src/shared/media/media-target-type.enum";
import {
  createdRange,
  escapeLike,
  isPaginated,
  normalizeSearch,
  pageWindow,
} from "src/shared/list-query/list-query.util";
import { DocumentSortBy } from "./enums/document-sort-by.enum";
import { DocumentEntity } from "src/content/document/entities/document.entity";
import { QueryDocumentDto } from "./dto/query-document.dto";

@Injectable()
export class DocumentRepository {
  constructor(
    @InjectRepository(DocumentEntity)
    private readonly repo: Repository<DocumentEntity>,
  ) {}

  async findAllSorted(query?: QueryDocumentDto): Promise<DocumentEntity[]> {
    return (await this.findFiltered(query)).items;
  }

  /** Filtros, ordenação e (com `page`) recorte da página, tudo no banco. */
  async findFiltered(
    query: QueryDocumentDto = {},
  ): Promise<{ items: DocumentEntity[]; total: number }> {
    const qb = this.repo.createQueryBuilder("d");

    const search = normalizeSearch(query.search);
    if (search) {
      qb.andWhere(
        "(d.name LIKE :search ESCAPE '\\\\' OR d.description LIKE :search ESCAPE '\\\\')",
        { search: `%${escapeLike(search)}%` },
      );
    }

    if (query.uploadType) {
      qb.andWhere(
        `EXISTS (SELECT 1 FROM media_items mi WHERE mi.targetId = d.id AND mi.targetType = :mediaTarget AND mi.uploadType = :uploadType)`,
        { mediaTarget: MediaTargetType.Document, uploadType: query.uploadType },
      );
    }

    const { from, to } = createdRange(query);
    if (from) qb.andWhere("d.createdAt >= :createdFrom", { createdFrom: from });
    if (to) qb.andWhere("d.createdAt <= :createdTo", { createdTo: to });

    const column = query.sortBy ?? DocumentSortBy.CREATED_AT;
    qb.orderBy(`d.${column}`, query.order ?? SortOrder.DESC).addOrderBy(
      "d.id",
      "ASC",
    );

    if (isPaginated(query)) {
      const { skip, take } = pageWindow(query);
      qb.skip(skip).take(take);
    }

    const [items, total] = await qb.getManyAndCount();
    return { items, total };
  }

  async findOneById(id: string): Promise<DocumentEntity | null> {
    return this.repo.findOne({
      where: { id },
    });
  }

  async findOneWithRelations(id: string): Promise<DocumentEntity | null> {
    return this.repo.findOne({
      where: { id },
      relations: ["route"],
    });
  }

  async upsertOne(data: Partial<DocumentEntity>): Promise<DocumentEntity> {
    const entity = this.repo.create(data);
    return this.repo.save(entity);
  }

  async removeOne(entity: DocumentEntity): Promise<DocumentEntity> {
    return this.repo.remove(entity);
  }

  async remove(entity: DocumentEntity): Promise<DocumentEntity> {
    return this.repo.remove(entity);
  }
}
