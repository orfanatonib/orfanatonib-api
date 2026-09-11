import { BaseEntity } from "src/shared/entity/base.entity";
import { Column, Entity, Index, JoinColumn, ManyToOne } from "typeorm";
import { UserEntity } from "src/core/user/entities/user.entity";

/**
 * Token de confirmação de e-mail. Separado do token de recuperação de senha:
 * validade, uso e ciclo de vida são outros.
 */
@Entity("email_verification_tokens")
export class EmailVerificationTokenEntity extends BaseEntity {
  @Index({ unique: true })
  @Column({ type: "varchar", length: 128 })
  token: string;

  @Column({ type: "datetime" })
  expiresAt: Date;

  /** Preenchido no momento da confirmação; token usado não vale de novo. */
  @Column({ type: "datetime", nullable: true })
  usedAt: Date | null;

  @Index()
  @Column({ type: "varchar", length: 36 })
  userId: string;

  @ManyToOne(() => UserEntity, { onDelete: "CASCADE" })
  @JoinColumn({ name: "userId" })
  user: UserEntity;
}
