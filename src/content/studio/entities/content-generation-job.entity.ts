import { BaseEntity } from "src/shared/entity/base.entity";
import { Column, Entity, Index, JoinColumn, ManyToOne } from "typeorm";

import { AiGenerationCapability } from "../ai/enums/ai-generation-capability.enum";
import { ContentGenerationJobStatus } from "../enums/content-generation-job-status.enum";
import { ContentStageEntity } from "./content-stage.entity";

@Entity("content_generation_jobs")
@Index(["status", "availableAt"])
@Index(["status", "leaseExpiresAt"])
export class ContentGenerationJobEntity extends BaseEntity {
  @Column({ name: "stage_id", type: "varchar", length: 36 })
  stageId: string;

  @Index({ unique: true })
  @Column({ type: "varchar", length: 191 })
  idempotencyKey: string;

  @Column({ type: "enum", enum: AiGenerationCapability })
  capability: AiGenerationCapability;

  @Column({
    type: "enum",
    enum: ContentGenerationJobStatus,
    default: ContentGenerationJobStatus.PENDING,
  })
  status: ContentGenerationJobStatus;

  @Column({ type: "json" })
  normalizedRequest: Record<string, unknown>;

  @Column({ type: "json" })
  configurationSnapshot: Record<string, unknown>;

  @Column({ type: "int", unsigned: true, default: 0 })
  attempts: number;

  @Column({ type: "datetime" })
  availableAt: Date;

  @Column({ type: "varchar", length: 100, nullable: true })
  workerId: string | null;

  @Column({ type: "datetime", nullable: true })
  leaseExpiresAt: Date | null;

  @Column({ type: "datetime", nullable: true })
  heartbeatAt: Date | null;

  /** Andamento da fase de imagens ({ phase, done, total, failed }): o que a tela mostra por SSE. */
  @Column({ type: "json", nullable: true })
  progress: Record<string, unknown> | null;

  @Column({ type: "varchar", length: 80, nullable: true })
  errorCode: string | null;

  @Column({ type: "varchar", length: 500, nullable: true })
  errorMessage: string | null;

  @Index()
  @Column({ type: "varchar", length: 36 })
  requestedById: string;

  @ManyToOne(() => ContentStageEntity, (stage) => stage.generationJobs, {
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "stage_id" })
  stage: ContentStageEntity;
}
