import { Injectable } from "@nestjs/common";
import { Brackets, DataSource, MoreThanOrEqual, Repository } from "typeorm";
import { ImageSectionCommentEntity } from "../entities/image-section-comment.entity";
import { FeedCommentStatus } from "../enums/feed-comment-status.enum";
import { FeedCommentDecision } from "../types";
import { FeedCommentSortBy } from "../enums/feed-comment-sort-by.enum";
import { SortOrder } from "src/shared/enums/sort-order.enum";
import { createdRange } from "src/shared/list-query/list-query.util";

/** Filtros extras da fila: intervalo de criação e ordenação (padrão: mais recentes primeiro). */
export interface FeedCommentModerationFilters {
  createdFrom?: string;
  createdTo?: string;
  sortBy?: FeedCommentSortBy;
  order?: SortOrder;
}

@Injectable()
export class ImageSectionCommentRepository extends Repository<ImageSectionCommentEntity> {
  constructor(dataSource: DataSource) {
    super(ImageSectionCommentEntity, dataSource.createEntityManager());
  }

  /** Só os aprovados: é o que todos enxergam. */
  findApprovedPageBySection(
    sectionId: string,
    page: number,
    limit: number,
  ): Promise<[ImageSectionCommentEntity[], number]> {
    return this.findAndCount({
      where: { sectionId, status: FeedCommentStatus.APPROVED },
      relations: ["author"],
      order: { createdAt: "DESC", id: "DESC" },
      skip: (page - 1) * limit,
      take: limit,
    });
  }

  /** Tudo o que o próprio autor enviou na publicação (qualquer status). */
  findMinePageBySection(
    sectionId: string,
    authorId: string,
    page: number,
    limit: number,
  ): Promise<[ImageSectionCommentEntity[], number]> {
    return this.findAndCount({
      where: { sectionId, authorId },
      relations: ["author"],
      order: { createdAt: "DESC", id: "DESC" },
      skip: (page - 1) * limit,
      take: limit,
    });
  }

  findWithAuthor(id: string): Promise<ImageSectionCommentEntity | null> {
    return this.findOne({
      where: { id },
      relations: ["author", "moderatedBy"],
    });
  }

  findByRequest(
    authorId: string,
    requestId: string,
  ): Promise<ImageSectionCommentEntity | null> {
    return this.findOne({
      where: { authorId, requestId },
      relations: ["author"],
    });
  }

  countSince(authorId: string, since: Date): Promise<number> {
    return this.countBy({ authorId, createdAt: MoreThanOrEqual(since) });
  }

  countPending(): Promise<number> {
    return this.countBy({ status: FeedCommentStatus.PENDING });
  }

  /** Total por status (as abas da fila de moderação). */
  async countByStatus(): Promise<Record<FeedCommentStatus, number>> {
    const counts: Record<FeedCommentStatus, number> = {
      [FeedCommentStatus.PENDING]: 0,
      [FeedCommentStatus.APPROVED]: 0,
      [FeedCommentStatus.REJECTED]: 0,
    };
    const rows = await this.createQueryBuilder("c")
      .select("c.status", "status")
      .addSelect("COUNT(*)", "total")
      .groupBy("c.status")
      .getRawMany<{ status: FeedCommentStatus; total: string }>();
    for (const row of rows) counts[row.status] = Number(row.total);
    return counts;
  }

  /** Contagem em lote só de aprovados (o contador do feed). */
  async countApprovedBySectionIds(
    sectionIds: string[],
  ): Promise<Map<string, number>> {
    const counts = new Map<string, number>();
    if (sectionIds.length === 0) return counts;
    const rows = await this.createQueryBuilder("c")
      .select("c.sectionId", "sectionId")
      .addSelect("COUNT(*)", "total")
      .where("c.sectionId IN (:...sectionIds)", { sectionIds })
      .andWhere("c.status = :status", { status: FeedCommentStatus.APPROVED })
      .groupBy("c.sectionId")
      .getRawMany<{ sectionId: string; total: string }>();
    for (const row of rows) counts.set(row.sectionId, Number(row.total));
    return counts;
  }

  /** Fila do admin: filtro por status e busca por texto, autor ou legenda da publicação. */
  findModerationPage(
    page: number,
    limit: number,
    status?: FeedCommentStatus,
    search?: string,
    filters: FeedCommentModerationFilters = {},
  ): Promise<[ImageSectionCommentEntity[], number]> {
    const qb = this.createQueryBuilder("c")
      .innerJoinAndSelect("c.author", "author")
      .innerJoin("c.section", "section")
      .leftJoinAndSelect("c.moderatedBy", "moderator");
    if (status) qb.andWhere("c.status = :status", { status });
    if (search) {
      qb.andWhere(
        new Brackets((brackets) => {
          brackets
            .where("c.content LIKE :search")
            .orWhere("author.name LIKE :search")
            .orWhere("section.caption LIKE :search");
        }),
        { search: `%${search.replace(/[%_\\]/g, "\\$&")}%` },
      );
    }
    const { from, to } = createdRange(filters);
    if (from) qb.andWhere("c.createdAt >= :createdFrom", { createdFrom: from });
    if (to) qb.andWhere("c.createdAt <= :createdTo", { createdTo: to });
    const column = filters.sortBy ?? FeedCommentSortBy.CREATED_AT;
    const order = filters.order ?? SortOrder.DESC;
    return qb
      .orderBy(`c.${column}`, order)
      .addOrderBy("c.id", "DESC")
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();
  }

  /** Decide só um comentário ainda PENDENTE; `false` se outro moderador chegou antes. */
  async decide(
    id: string,
    status: FeedCommentStatus.APPROVED | FeedCommentStatus.REJECTED,
    decision: FeedCommentDecision,
  ): Promise<boolean> {
    const result = await this.update(
      { id, status: FeedCommentStatus.PENDING },
      {
        status,
        moderationReason: decision.reason,
        moderatedById: decision.moderatorId,
        reviewedAt: new Date(),
      },
    );
    return result.affected === 1;
  }
}
