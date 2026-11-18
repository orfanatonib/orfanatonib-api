import { BaseEntity } from "src/shared/entity/base.entity";
import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  VersionColumn,
} from "typeorm";

import { ContentStageStatus } from "../enums/content-stage-status.enum";
import { ContentStageType } from "../enums/content-stage-type.enum";
import { ContentGenerationJobEntity } from "./content-generation-job.entity";
import { ContentReviewCommentEntity } from "./content-review-comment.entity";
import { ContentReviewDecisionEntity } from "./content-review-decision.entity";
import { ContentTrackEntity } from "./content-track.entity";
import { ContentVersionEntity } from "./content-version.entity";

@Entity("content_stages")
@Index(["trackId", "stageType"], { unique: true })
@Index(["status", "updatedAt"])
export class ContentStageEntity extends BaseEntity {
  @Column({ name: "track_id", type: "varchar", length: 36 })
  trackId: string;

  @Column({ type: "enum", enum: ContentStageType })
  stageType: ContentStageType;

  @Column({ type: "smallint", unsigned: true })
  position: number;

  @Column({ type: "boolean", default: true })
  required: boolean;

  @Column({ type: "json" })
  dependencies: ContentStageType[];

  @Column({
    type: "enum",
    enum: ContentStageStatus,
    default: ContentStageStatus.NOT_STARTED,
  })
  status: ContentStageStatus;

  @Column({
    name: "current_version_id",
    type: "varchar",
    length: 36,
    nullable: true,
  })
  currentVersionId: string | null;

  @VersionColumn()
  lockVersion: number;

  @ManyToOne(() => ContentTrackEntity, (track) => track.stages, {
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "track_id" })
  track: ContentTrackEntity;

  @OneToMany(() => ContentVersionEntity, (version) => version.stage)
  versions: ContentVersionEntity[];

  @ManyToOne(() => ContentVersionEntity, {
    nullable: true,
    onDelete: "SET NULL",
  })
  @JoinColumn({ name: "current_version_id" })
  currentVersion: ContentVersionEntity | null;

  @OneToMany(() => ContentGenerationJobEntity, (job) => job.stage)
  generationJobs: ContentGenerationJobEntity[];

  @OneToMany(() => ContentReviewCommentEntity, (comment) => comment.stage)
  reviewComments: ContentReviewCommentEntity[];

  @OneToMany(() => ContentReviewDecisionEntity, (decision) => decision.stage)
  reviewDecisions: ContentReviewDecisionEntity[];
}
