import { Column, Entity, Index, JoinColumn, ManyToOne } from "typeorm";
import { BaseEntity } from "src/shared/entity/base.entity";
import { UserEntity } from "src/core/user/entities/user.entity";
import { ImageSectionEntity } from "src/content/page/image-page/entities/image-section.entity";
import { FEED_COMMENT_MAX_LENGTH } from "../constants";

/** Comentário numa publicação (foto) do feed. Removido junto com a seção ou o autor. */
@Entity("image_section_comments")
@Index("IDX_image_section_comments_section_created", ["sectionId", "createdAt"])
export class ImageSectionCommentEntity extends BaseEntity {
  @Column({ type: "varchar", length: 36 })
  sectionId: string;

  @Column({ type: "varchar", length: 36 })
  authorId: string;

  @Column({ type: "varchar", length: FEED_COMMENT_MAX_LENGTH })
  content: string;

  @ManyToOne(() => ImageSectionEntity, { onDelete: "CASCADE" })
  @JoinColumn({ name: "sectionId" })
  section?: ImageSectionEntity;

  @ManyToOne(() => UserEntity, { onDelete: "CASCADE" })
  @JoinColumn({ name: "authorId" })
  author?: UserEntity;
}
