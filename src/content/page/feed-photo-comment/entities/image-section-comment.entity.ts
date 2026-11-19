import { Column, Entity, Index, JoinColumn, ManyToOne } from "typeorm";
import { BaseEntity } from "src/shared/entity/base.entity";
import { UserEntity } from "src/core/user/entities/user.entity";
import { ImageSectionEntity } from "src/content/page/image-page/entities/image-section.entity";
import {
  FEED_COMMENT_MAX_LENGTH,
  FEED_COMMENT_REASON_MAX_LENGTH,
} from "../constants";
import { FeedCommentStatus } from "../enums/feed-comment-status.enum";

/**
 * Comentário numa publicação (foto) do feed. Nasce PENDING e só aparece para
 * todos depois de aprovado. Removido junto com a seção ou o autor.
 */
@Entity("image_section_comments")
@Index("IDX_image_section_comments_section_created", ["sectionId", "createdAt"])
@Index("IDX_image_section_comments_section_status_created", [
  "sectionId",
  "status",
  "createdAt",
])
@Index("IDX_image_section_comments_status_created", ["status", "createdAt"])
@Index("UQ_image_section_comments_author_request", ["authorId", "requestId"], {
  unique: true,
})
export class ImageSectionCommentEntity extends BaseEntity {
  @Column({ type: "varchar", length: 36 })
  sectionId: string;

  @Column({ type: "varchar", length: 36 })
  authorId: string;

  /** Chave de idempotência do envio. Nula nos comentários anteriores à moderação. */
  @Column({ type: "varchar", length: 36, nullable: true })
  requestId: string | null;

  @Column({ type: "varchar", length: FEED_COMMENT_MAX_LENGTH })
  content: string;

  /**
   * O padrão do banco é APPROVED só para que os comentários que já existiam
   * continuem publicados na migração; o código sempre grava PENDING ao criar.
   */
  @Column({
    type: "enum",
    enum: FeedCommentStatus,
    default: FeedCommentStatus.APPROVED,
  })
  status: FeedCommentStatus;

  @Column({
    type: "varchar",
    length: FEED_COMMENT_REASON_MAX_LENGTH,
    nullable: true,
  })
  moderationReason: string | null;

  @Column({ type: "varchar", length: 36, nullable: true })
  moderatedById: string | null;

  @Column({ type: "datetime", nullable: true })
  reviewedAt: Date | null;

  @ManyToOne(() => ImageSectionEntity, { onDelete: "CASCADE" })
  @JoinColumn({ name: "sectionId" })
  section?: ImageSectionEntity;

  @ManyToOne(() => UserEntity, { onDelete: "CASCADE" })
  @JoinColumn({ name: "authorId" })
  author?: UserEntity;

  @ManyToOne(() => UserEntity, { onDelete: "SET NULL", nullable: true })
  @JoinColumn({ name: "moderatedById" })
  moderatedBy?: UserEntity | null;
}
