import { InboxNotificationEntity } from "../entities/inbox-notification.entity";
import { InboxNotificationSource } from "../enums/inbox-notification-source.enum";
import { InboxNotificationTargetKind } from "../enums/inbox-notification-target-kind.enum";
import { InboxNotificationType } from "../enums/inbox-notification-type.enum";
import { InboxSummaryData } from "../types";
import { buildRevision } from "../utils/inbox-notice.utils";

export class InboxNotificationTargetDto {
  kind: InboxNotificationTargetKind;
  id: string;
  audience: string | null;
  stage: string | null;
}

export class InboxNotificationResponseDto {
  id: string;
  source: InboxNotificationSource;
  type: InboxNotificationType;
  title: string;
  preview: string;
  createdAt: string;
  readAt: string | null;
  target: InboxNotificationTargetDto;

  static fromEntity(
    entity: InboxNotificationEntity,
  ): InboxNotificationResponseDto {
    return {
      id: entity.id,
      source: entity.source,
      type: entity.type,
      title: entity.title,
      preview: entity.preview,
      createdAt: entity.createdAt.toISOString(),
      readAt: entity.readAt ? entity.readAt.toISOString() : null,
      target: {
        kind: entity.targetKind,
        id: entity.targetId,
        audience: entity.targetAudience,
        stage: entity.targetStage,
      },
    };
  }
}

export class InboxNotificationsPageDto {
  items: InboxNotificationResponseDto[];
  total: number;
  page: number;
  limit: number;
  unreadCount: number;
}

export class InboxRecentDto {
  id: string;
  type: InboxNotificationType;
  createdAt: string;
}

export class InboxSummaryResponseDto {
  unreadCount: number;
  total: number;
  /** Chave opaca derivada do estado persistido; muda em criação, leitura e exclusão. */
  revision: string;
  /** Até dez não lidos mais recentes, só com identidade e data. */
  recentUnread: InboxRecentDto[];

  static fromData(data: InboxSummaryData): InboxSummaryResponseDto {
    return {
      unreadCount: data.unreadCount,
      total: data.total,
      revision: buildRevision(data),
      recentUnread: data.recentUnread.map((item) => ({
        id: item.id,
        type: item.type,
        createdAt: item.createdAt.toISOString(),
      })),
    };
  }
}

export class InboxReadAllResponseDto {
  updatedCount: number;
  summary: InboxSummaryResponseDto;
}
