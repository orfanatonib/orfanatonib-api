import { BaseEntity } from "src/shared/entity/base.entity";
import { Column, Entity, Index, JoinColumn, ManyToOne } from "typeorm";

import { ContentStageEntity } from "./content-stage.entity";

@Entity("content_versions")
@Index(["stageId", "versionNumber"], { unique: true })
export class ContentVersionEntity extends BaseEntity {
  @Column({ name: "stage_id", type: "varchar", length: 36 })
  stageId: string;

  @Column({ type: "int", unsigned: true })
  versionNumber: number;

  @Column({ type: "json" })
  structuredContent: Record<string, unknown>;

  @Column({ type: "char", length: 64 })
  contentChecksum: string;

  @Column({ type: "varchar", length: 64 })
  templateVersion: string;

  @Column({ type: "json", nullable: true })
  generationSnapshot: Record<string, unknown> | null;

  @Index()
  @Column({ type: "varchar", length: 36 })
  createdById: string;

  @ManyToOne(() => ContentStageEntity, (stage) => stage.versions, {
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "stage_id" })
  stage: ContentStageEntity;
}
