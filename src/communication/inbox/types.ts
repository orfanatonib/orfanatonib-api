import { InboxNotificationSource } from "./enums/inbox-notification-source.enum";
import { InboxNotificationTargetKind } from "./enums/inbox-notification-target-kind.enum";
import { InboxNotificationType } from "./enums/inbox-notification-type.enum";

/** O que quem produz o evento informa; título e prévia são montados aqui, nunca pelo chamador. */
export interface InboxNoticeInput {
  readonly source: InboxNotificationSource;
  readonly type: InboxNotificationType;
  readonly targetKind: InboxNotificationTargetKind;
  readonly targetId: string;
  /** Nome do material/lição, para a prévia. */
  readonly label: string;
  readonly targetAudience?: string | null;
  readonly targetStage?: string | null;
  readonly actorId?: string | null;
  /** Identifica o evento: o mesmo evento repetido (retry, duplo clique) não gera um segundo aviso. */
  readonly dedupeKey: string;
}

export interface InboxNoticeRow {
  readonly recipientId: string;
  readonly source: InboxNotificationSource;
  readonly type: InboxNotificationType;
  readonly title: string;
  readonly preview: string;
  readonly targetKind: InboxNotificationTargetKind;
  readonly targetId: string;
  readonly targetAudience: string | null;
  readonly targetStage: string | null;
  readonly actorId: string | null;
  readonly dedupeKey: string;
}

export interface InboxSummaryData {
  readonly total: number;
  readonly unreadCount: number;
  readonly lastChangedAt: Date | null;
  readonly recentUnread: ReadonlyArray<{
    id: string;
    type: InboxNotificationType;
    createdAt: Date;
  }>;
}

export interface InboxPageQuery {
  readonly page: number;
  readonly limit: number;
  readonly unreadOnly: boolean;
  readonly type?: InboxNotificationType;
}
