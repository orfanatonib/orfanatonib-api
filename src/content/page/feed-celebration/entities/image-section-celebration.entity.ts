import { Column, Entity, JoinColumn, ManyToOne, Unique } from "typeorm";
import { BaseEntity } from "src/shared/entity/base.entity";
import { UserEntity } from "src/core/user/entities/user.entity";
import { ImageSectionEntity } from "src/content/page/image-page/entities/image-section.entity";
import { FEED_CELEBRATION_UNIQUE_INDEX } from "../constants";

/** "Celebrar": uma reação por pessoa e publicação (unicidade no banco). */
@Entity("image_section_celebrations")
@Unique(FEED_CELEBRATION_UNIQUE_INDEX, ["sectionId", "userId"])
export class ImageSectionCelebrationEntity extends BaseEntity {
  @Column({ type: "varchar", length: 36 })
  sectionId: string;

  @Column({ type: "varchar", length: 36 })
  userId: string;

  @ManyToOne(() => ImageSectionEntity, { onDelete: "CASCADE" })
  @JoinColumn({ name: "sectionId" })
  section?: ImageSectionEntity;

  @ManyToOne(() => UserEntity, { onDelete: "CASCADE" })
  @JoinColumn({ name: "userId" })
  user?: UserEntity;
}
