import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  VersionColumn,
} from "typeorm";

@Entity("feature_flags")
export class FeatureFlagEntity {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ unique: true, length: 255 })
  key: string;

  @Column({ length: 255 })
  name: string;

  @Column({ type: "text", nullable: true })
  description: string | null;

  @Column({ default: false })
  enabled: boolean;

  /** Flag de fábrica: não pode ser renomeada nem removida (desligue-a). */
  @Column({ name: "protected", type: "boolean", default: false })
  isProtected: boolean;

  /** Controle otimista: incrementado a cada escrita. */
  @VersionColumn({ default: 1 })
  version: number;

  @Column({ type: "json", nullable: true })
  metadata: Record<string, unknown> | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;
}
