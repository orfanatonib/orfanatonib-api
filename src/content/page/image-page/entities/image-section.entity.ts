import { Entity, Column, ManyToOne } from "typeorm";
import { UserEntity } from "src/core/user/entities/user.entity";
import { ImagePageEntity } from "./image-page.entity";
import { BaseEntity } from "src/shared/entity/base.entity";

@Entity("image_sections")
export class ImageSectionEntity extends BaseEntity {
  @Column()
  caption: string;

  @Column({ type: "text" })
  description: string;

  @Column({ default: true })
  public: boolean;

  @ManyToOne(() => ImagePageEntity, (page) => page.sections, {
    onDelete: "CASCADE",
    nullable: true,
  })
  page?: ImagePageEntity | null;

  /**
   * Quem publicou (usuário autenticado). Nulo nas seções anteriores ao feed v2
   * e quando a conta é removida — nunca se adivinha autoria retroativa.
   */
  @ManyToOne(() => UserEntity, { onDelete: "SET NULL", nullable: true })
  author?: UserEntity | null;
}
