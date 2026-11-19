import { Entity, Column, ManyToOne } from "typeorm";
import { ImageSectionReviewStatus } from "../../image-section/enums/image-section-review-status.enum";
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

  /**
   * Revisão do admin. Linhas anteriores à moderação ficaram `approved` se já estavam
   * anexadas a uma galeria e `pending` se não (backfill da migration).
   */
  @Column({
    type: "enum",
    enum: ImageSectionReviewStatus,
    default: ImageSectionReviewStatus.PENDING,
  })
  reviewStatus: ImageSectionReviewStatus;

  /** Motivo da reprovação: o autor recebe na tela e por e-mail. */
  @Column({ type: "varchar", length: 500, nullable: true })
  rejectionReason?: string | null;

  /** Quem revisou (aprovou ou reprovou). Nulo se a conta foi removida. */
  @ManyToOne(() => UserEntity, { onDelete: "SET NULL", nullable: true })
  reviewedBy?: UserEntity | null;

  @Column({ type: "datetime", nullable: true })
  reviewedAt?: Date | null;
}
