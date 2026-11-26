import { BaseEntity } from "src/shared/entity/base.entity";
import { Column, Entity, Index, JoinColumn, ManyToOne } from "typeorm";

import { ContentReviewDecisionType } from "../enums/content-review-decision-type.enum";
import { ContentStageEntity } from "./content-stage.entity";
import { ContentVersionEntity } from "./content-version.entity";

@Entity("content_review_decisions")
@Index(["packageId", "decidedAt"])
@Index(["stageId", "decidedAt"])
@Index(["versionId"])
export class ContentReviewDecisionEntity extends BaseEntity {
  @Column({ name: "package_id", type: "varchar", length: 36 })
  packageId: string;

  @Column({ name: "stage_id", type: "varchar", length: 36 })
  stageId: string;

  @Column({ name: "version_id", type: "varchar", length: 36 })
  versionId: string;

  @Column({ type: "char", length: 64 })
  contentChecksum: string;

  @Column({ type: "enum", enum: ContentReviewDecisionType })
  decision: ContentReviewDecisionType;

  @Column({ type: "varchar", length: 36 })
  reviewerId: string;

  @Column({
    name: "related_comment_id",
    type: "varchar",
    length: 36,
    nullable: true,
  })
  relatedCommentId: string | null;

  @Column({ type: "datetime" })
  decidedAt: Date;

  @ManyToOne(() => ContentStageEntity, (stage) => stage.reviewDecisions, {
    onDelete: "RESTRICT",
  })
  @JoinColumn({ name: "stage_id" })
  stage: ContentStageEntity;

  @ManyToOne(() => ContentVersionEntity, { onDelete: "RESTRICT" })
  @JoinColumn({ name: "version_id" })
  version: ContentVersionEntity;
}
