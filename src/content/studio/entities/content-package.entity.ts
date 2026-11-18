import { BaseEntity } from "src/shared/entity/base.entity";
import { Column, Entity, Index, OneToMany, VersionColumn } from "typeorm";

import { ContentPackageStatus } from "../enums/content-package-status.enum";
import { ContentTrackEntity } from "./content-track.entity";

@Entity("content_packages")
@Index(["status", "updatedAt"])
export class ContentPackageEntity extends BaseEntity {
  @Column({ type: "varchar", length: 180 })
  theme: string;

  @Column({ type: "varchar", length: 500 })
  biblicalReferences: string;

  @Column({ type: "text" })
  canonicalObjective: string;

  @Column({ type: "text", nullable: true })
  canonicalNotes: string | null;

  @Column({ type: "varchar", length: 64 })
  templateCatalogVersion: string;

  @Column({ type: "enum", enum: ContentPackageStatus, default: ContentPackageStatus.DRAFT })
  status: ContentPackageStatus;

  @Index()
  @Column({ type: "varchar", length: 36 })
  createdById: string;

  @Column({ type: "datetime", nullable: true })
  archivedAt: Date | null;

  @VersionColumn()
  lockVersion: number;

  @OneToMany(() => ContentTrackEntity, (track) => track.contentPackage)
  tracks: ContentTrackEntity[];
}

