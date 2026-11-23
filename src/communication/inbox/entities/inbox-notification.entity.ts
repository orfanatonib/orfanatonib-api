import { BaseEntity } from "src/shared/entity/base.entity";
import { Column, Entity, Index, JoinColumn, ManyToOne } from "typeorm";

import { UserEntity } from "src/core/user/entities/user.entity";

import { INBOX_DEDUPE_KEY_MAX_LENGTH } from "../constants/inbox-notification.constants";
import { InboxNotificationSource } from "../enums/inbox-notification-source.enum";
import { InboxNotificationTargetKind } from "../enums/inbox-notification-target-kind.enum";
import { InboxNotificationType } from "../enums/inbox-notification-type.enum";

/** Aviso persistido do sininho: um por destinatário e por evento (`recipientId` + `dedupeKey` é único). */
@Entity("inbox_notifications")
@Index("UQ_inbox_notification_recipient_dedupe", ["recipientId", "dedupeKey"], {
  unique: true,
})
@Index("IDX_inbox_notification_recipient_read_created", [
  "recipientId",
  "readAt",
  "createdAt",
])
export class InboxNotificationEntity extends BaseEntity {
  @Column({ type: "varchar", length: 36 })
  recipientId: string;

  @ManyToOne(() => UserEntity, { onDelete: "CASCADE", nullable: false })
  @JoinColumn({ name: "recipientId" })
  recipient: UserEntity;

  @Column({ type: "enum", enum: InboxNotificationSource })
  source: InboxNotificationSource;

  @Column({ type: "enum", enum: InboxNotificationType })
  type: InboxNotificationType;

  @Column({ type: "varchar", length: 160 })
  title: string;

  @Column({ type: "varchar", length: 400 })
  preview: string;

  @Column({ type: "enum", enum: InboxNotificationTargetKind })
  targetKind: InboxNotificationTargetKind;

  @Column({ type: "varchar", length: 36 })
  targetId: string;

  @Column({ type: "varchar", length: 20, nullable: true })
  targetAudience: string | null;

  @Column({ type: "varchar", length: 40, nullable: true })
  targetStage: string | null;

  @Column({ type: "varchar", length: 36, nullable: true })
  actorId: string | null;

  @Column({ type: "varchar", length: INBOX_DEDUPE_KEY_MAX_LENGTH })
  dedupeKey: string;

  @Column({ type: "datetime", nullable: true })
  readAt: Date | null;
}
