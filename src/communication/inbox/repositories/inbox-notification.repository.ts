import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { IsNull, Repository } from "typeorm";

import { INBOX_RECENT_UNREAD_LIMIT } from "../constants/inbox-notification.constants";
import { InboxNotificationEntity } from "../entities/inbox-notification.entity";
import { InboxNoticeRow, InboxPageQuery, InboxSummaryData } from "../types";

@Injectable()
export class InboxNotificationRepository {
  constructor(
    @InjectRepository(InboxNotificationEntity)
    private readonly repo: Repository<InboxNotificationEntity>,
  ) {}

  /**
   * Insere ignorando o que já existe (mesmo destinatário e mesmo `dedupeKey`): é o que torna o envio
   * idempotente em retry e em duplo clique. Devolve quantos avisos novos foram criados.
   */
  async createMany(rows: readonly InboxNoticeRow[]): Promise<number> {
    if (rows.length === 0) return 0;
    const result = await this.repo
      .createQueryBuilder()
      .insert()
      .into(InboxNotificationEntity)
      .values(rows.map((row) => ({ ...row, readAt: null })))
      .orIgnore()
      .execute();
    const raw = result.raw as { affectedRows?: number } | undefined;
    return raw?.affectedRows ?? rows.length;
  }

  async findPage(
    recipientId: string,
    query: InboxPageQuery,
  ): Promise<{ items: InboxNotificationEntity[]; total: number }> {
    const qb = this.repo
      .createQueryBuilder("n")
      .where("n.recipientId = :recipientId", { recipientId });
    if (query.unreadOnly) qb.andWhere("n.readAt IS NULL");
    if (query.type) qb.andWhere("n.type = :type", { type: query.type });
    const [items, total] = await qb
      .orderBy("n.createdAt", "DESC")
      .addOrderBy("n.id", "DESC")
      .skip((query.page - 1) * query.limit)
      .take(query.limit)
      .getManyAndCount();
    return { items, total };
  }

  async summarize(recipientId: string): Promise<InboxSummaryData> {
    const [total, unreadCount, last, recent] = await Promise.all([
      this.repo.count({ where: { recipientId } }),
      this.repo.count({ where: { recipientId, readAt: IsNull() } }),
      this.repo
        .createQueryBuilder("n")
        .select("MAX(n.updatedAt)", "lastChangedAt")
        .where("n.recipientId = :recipientId", { recipientId })
        .getRawOne<{ lastChangedAt: Date | string | null }>(),
      this.repo.find({
        where: { recipientId, readAt: IsNull() },
        order: { createdAt: "DESC", id: "DESC" },
        take: INBOX_RECENT_UNREAD_LIMIT,
        select: { id: true, type: true, createdAt: true },
      }),
    ]);
    const lastChangedAt = last?.lastChangedAt
      ? new Date(last.lastChangedAt)
      : null;
    return {
      total,
      unreadCount,
      lastChangedAt:
        lastChangedAt && !Number.isNaN(lastChangedAt.getTime())
          ? lastChangedAt
          : null,
      recentUnread: recent.map((item) => ({
        id: item.id,
        type: item.type,
        createdAt: item.createdAt,
      })),
    };
  }

  findOneFor(
    id: string,
    recipientId: string,
  ): Promise<InboxNotificationEntity | null> {
    return this.repo.findOne({ where: { id, recipientId } });
  }

  /** Idempotente: repetir mantém o primeiro `readAt`. Devolve `false` se o aviso não é do destinatário. */
  async markRead(id: string, recipientId: string): Promise<boolean> {
    const found = await this.repo.exist({ where: { id, recipientId } });
    if (!found) return false;
    await this.repo
      .createQueryBuilder()
      .update(InboxNotificationEntity)
      .set({ readAt: () => "CURRENT_TIMESTAMP" })
      .where("id = :id AND recipientId = :recipientId AND readAt IS NULL", {
        id,
        recipientId,
      })
      .execute();
    return true;
  }

  async markAllRead(recipientId: string): Promise<number> {
    const result = await this.repo
      .createQueryBuilder()
      .update(InboxNotificationEntity)
      .set({ readAt: () => "CURRENT_TIMESTAMP" })
      .where("recipientId = :recipientId AND readAt IS NULL", { recipientId })
      .execute();
    return result.affected ?? 0;
  }
}
