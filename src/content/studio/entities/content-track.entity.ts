import { BaseEntity } from "src/shared/entity/base.entity";
import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
} from "typeorm";

import { ContentAudience } from "../enums/content-audience.enum";
import { ContentPackageEntity } from "./content-package.entity";
import { ContentStageEntity } from "./content-stage.entity";

@Entity("content_tracks")
@Index(["packageId", "audience"], { unique: true })
export class ContentTrackEntity extends BaseEntity {
  @Column({ name: "package_id", type: "varchar", length: 36 })
  packageId: string;

  @Column({ type: "enum", enum: ContentAudience })
  audience: ContentAudience;

  @Column({ type: "varchar", length: 80 })
  audienceName: string;

  @Column({ type: "smallint", unsigned: true })
  minimumAge: number;

  @Column({ type: "smallint", unsigned: true, nullable: true })
  maximumAge: number | null;

  /**
   * Quando a categoria foi publicada na página de Materiais de Visita; `null` enquanto não foi. Categoria publicada
   * fica travada: não se edita, gera, conclui nem reenvia (a página já mostra essa versão aprovada).
   */
  @Column({ name: "published_at", type: "datetime", nullable: true })
  publishedAt: Date | null;

  /** Publicação (`content_publications`) que levou a categoria à página. */
  @Column({
    name: "publication_id",
    type: "varchar",
    length: 36,
    nullable: true,
  })
  publicationId: string | null;

  @ManyToOne(
    () => ContentPackageEntity,
    (contentPackage) => contentPackage.tracks,
    {
      onDelete: "CASCADE",
    },
  )
  @JoinColumn({ name: "package_id" })
  contentPackage: ContentPackageEntity;

  @OneToMany(() => ContentStageEntity, (stage) => stage.track)
  stages: ContentStageEntity[];
}
