import { UserRole } from "src/core/auth/auth.types";
import { LeaderProfileEntity } from "src/shelter/leader-profile/entities/leader-profile.entity/leader-profile.entity";
import { MemberProfileEntity } from "src/shelter/member-profile/entities/member-profile.entity/member-profile.entity";
import { BaseEntity } from "src/shared/entity/base.entity";
import { MediaItemEntity } from "src/shared/media/media-item/media-item.entity";
import { Entity, Column, OneToOne } from "typeorm";

@Entity("users")
export class UserEntity extends BaseEntity {
  @Column({ unique: true })
  email: string;

  @Column()
  password: string;

  @Column()
  phone: string;

  @Column()
  name: string;

  @Column({ type: "boolean", default: false })
  active: boolean;

  @Column({ type: "boolean", default: false })
  completed: boolean;

  @Column({ type: "boolean", default: true })
  commonUser: boolean;

  @Column({ type: "enum", enum: UserRole, default: UserRole.MEMBER })
  role: UserRole;

  @Column({ nullable: true, type: "text" })
  refreshToken: string | null;

  /**
   * Momento em que o dono do e-mail clicou no link de confirmação.
   * `null` = ainda não confirmado.
   */
  @Column({ nullable: true, type: "datetime" })
  emailVerifiedAt: Date | null;

  @OneToOne(() => MemberProfileEntity, (p) => p.user)
  memberProfile?: MemberProfileEntity | null;

  @OneToOne(() => LeaderProfileEntity, (p) => p.user)
  leaderProfile?: LeaderProfileEntity | null;
  /**
   * Foto de perfil, anexada em memória para a resposta. Não é coluna: a mídia
   * vive em `media_items`, referenciada por `targetId`/`targetType`.
   */
  imageProfile?: MediaItemEntity | null;
}
