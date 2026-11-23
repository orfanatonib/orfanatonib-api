import { Injectable } from "@nestjs/common";
import { DataSource, Repository } from "typeorm";
import { CreateCommentDto } from "../dto/create-comment.dto";
import { UpdateCommentDto } from "../dto/update-comment.dto";
import { CommentEntity } from "../entities/comment.entity";
import { CommentListQueryDto } from "../dto/comment-list-query.dto";
import { CommentSortBy } from "../enums/comment-sort-by.enum";
import { SortOrder } from "src/shared/enums/sort-order.enum";
import {
  createdRange,
  escapeLike,
  isPaginated,
  normalizeSearch,
  pageWindow,
} from "src/shared/list-query/list-query.util";

@Injectable()
export class CommentRepository extends Repository<CommentEntity> {
  constructor(private readonly dataSource: DataSource) {
    super(CommentEntity, dataSource.createEntityManager());
  }

  async createAndSave(dto: CreateCommentDto): Promise<CommentEntity> {
    const comment = this.create(dto);
    return this.save(comment);
  }

  async findAllPublished(): Promise<CommentEntity[]> {
    return this.find({
      where: { published: true },
      order: { createdAt: "DESC" },
    });
  }
  /** Comentários que o admin ainda não publicou. */
  async countPending(): Promise<number> {
    return this.countBy({ published: false });
  }

  async findAll(): Promise<CommentEntity[]> {
    return this.find({ order: { createdAt: "DESC" } });
  }

  /** Filtros, ordenação e (com `page`) recorte da página, tudo no banco. */
  async findFiltered(
    query: CommentListQueryDto = {},
  ): Promise<{ items: CommentEntity[]; total: number }> {
    const qb = this.createQueryBuilder("c");

    const search = normalizeSearch(query.search);
    if (search) {
      qb.andWhere(
        "(c.name LIKE :search ESCAPE '\\\\' OR c.comment LIKE :search ESCAPE '\\\\' OR c.shelter LIKE :search ESCAPE '\\\\' OR c.neighborhood LIKE :search ESCAPE '\\\\')",
        { search: `%${escapeLike(search)}%` },
      );
    }
    const shelter = normalizeSearch(query.shelter);
    if (shelter) {
      qb.andWhere("c.shelter LIKE :shelter ESCAPE '\\\\'", {
        shelter: `%${escapeLike(shelter)}%`,
      });
    }
    if (query.published !== undefined) {
      qb.andWhere("c.published = :published", { published: query.published });
    }
    const { from, to } = createdRange(query);
    if (from) qb.andWhere("c.createdAt >= :createdFrom", { createdFrom: from });
    if (to) qb.andWhere("c.createdAt <= :createdTo", { createdTo: to });

    const column = query.sortBy ?? CommentSortBy.CREATED_AT;
    qb.orderBy(`c.${column}`, query.order ?? SortOrder.DESC).addOrderBy(
      "c.id",
      "ASC",
    );
    if (isPaginated(query)) {
      const { skip, take } = pageWindow(query);
      qb.skip(skip).take(take);
    }
    const [items, total] = await qb.getManyAndCount();
    return { items, total };
  }

  async findById(id: string): Promise<CommentEntity | null> {
    return this.findOneBy({ id });
  }

  async updateAndSave(
    entity: CommentEntity,
    dto: UpdateCommentDto,
  ): Promise<CommentEntity> {
    Object.assign(entity, dto);
    return this.save(entity);
  }

  async removeComment(entity: CommentEntity): Promise<void> {
    await this.remove(entity);
  }
}
