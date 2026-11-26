import { Column, Entity, Index } from "typeorm";

import { BaseEntity } from "src/shared/entity/base.entity";

@Entity("media_cleanup_queue")
export class MediaCleanupQueueEntity extends BaseEntity {
  @Index({ unique: true })
  @Column({ type: "varchar", length: 512 })
  storageKey: string;

  @Column({ type: "int", default: 0 })
  attempts: number;

  @Column({ type: "text", nullable: true })
  lastError?: string | null;

  /** Preenchido quando excede o máximo de tentativas (precisa de atenção humana). */
  @Column({ type: "datetime", nullable: true })
  failedAt?: Date | null;
}
