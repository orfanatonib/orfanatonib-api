import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
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

  /**
   * O tipo é explícito de propósito: com `string | null`, o `design:type`
   * refletido de uma união é `Object`, e o TypeORM recusa a entidade com
   * `DataTypeNotSupportedError` — a aplicação nem chega a conectar no banco.
   */
  @Column({ type: "varchar", length: 50, nullable: true })
  environment: string | null;

  @Column({ type: "json", nullable: true })
  metadata: Record<string, unknown> | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;
}
