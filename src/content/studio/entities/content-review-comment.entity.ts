import { BaseEntity } from "src/shared/entity/base.entity";
import { Column, Entity, Index, JoinColumn, ManyToOne } from "typeorm";

import { ContentReviewCommentStatus } from "../enums/content-review-comment-status.enum";
import { ContentPackageEntity } from "./content-package.entity";
import { ContentStageEntity } from "./content-stage.entity";
import { ContentVersionEntity } from "./content-version.entity";

@Entity("content_review_comments")
@Index(["stageId", "status", "createdAt"])
export class ContentReviewCommentEntity extends BaseEntity {
  @Column({ name: "package_id", type: "varchar", length: 36 })
  packageId: string;

  @Column({ name: "stage_id", type: "varchar", length: 36 })
  stageId: string;

  @Column({ name: "version_id", type: "varchar", length: 36 })
  versionId: string;

  @Column({ type: "varchar", length: 255, nullable: true })
  blockKey: string | null;

  @Column({ type: "text" })
  message: string;

  @Column({
    type: "enum",
    enum: ContentReviewCommentStatus,
    default: ContentReviewCommentStatus.OPEN,
  })
  status: ContentReviewCommentStatus;

  @Column({ type: "varchar", length: 36 })
  authorId: string;

  /** O que a produção respondeu ao resolver ("Resolver e devolver"); vazio quando o item foi refeito e concluído. */
  @Column({ type: "text", nullable: true })
  resolutionMessage: string | null;

  @Column({ type: "varchar", length: 36, nullable: true })
  resolvedById: string | null;

  @Column({ type: "datetime", nullable: true })
  resolvedAt: Date | null;

  @ManyToOne(() => ContentPackageEntity, { onDelete: "CASCADE" })
  @JoinColumn({ name: "package_id" })
  contentPackage: ContentPackageEntity;

  @ManyToOne(() => ContentStageEntity, { onDelete: "CASCADE" })
  @JoinColumn({ name: "stage_id" })
  stage: ContentStageEntity;

  @ManyToOne(() => ContentVersionEntity, { onDelete: "CASCADE" })
  @JoinColumn({ name: "version_id" })
  version: ContentVersionEntity;
}
