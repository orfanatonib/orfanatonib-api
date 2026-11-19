import { BaseEntity } from "src/shared/entity/base.entity";
import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  VersionColumn,
} from "typeorm";

import { ContentPublicationStatus } from "../enums/content-publication-status.enum";
import { ContentPublicationTargetType } from "../enums/content-publication-target-type.enum";
import { ContentAssetEntity } from "./content-asset.entity";
import { ContentPackageEntity } from "./content-package.entity";

@Entity("content_publications")
@Index(["packageId", "createdAt"])
export class ContentPublicationEntity extends BaseEntity {
  @Column({ name: "package_id", type: "varchar", length: 36 })
  packageId: string;

  @Index({ unique: true })
  @Column({ type: "varchar", length: 191 })
  idempotencyKey: string;

  @Column({
    type: "enum",
    enum: ContentPublicationTargetType,
    default: ContentPublicationTargetType.PDF_EXPORT,
  })
  targetType: ContentPublicationTargetType;

  @Column({
    type: "enum",
    enum: ContentPublicationStatus,
    default: ContentPublicationStatus.PENDING,
  })
  status: ContentPublicationStatus;

  @Column({ type: "json" })
  approvedVersions: Record<string, string>;

  @Column({ name: "asset_id", type: "varchar", length: 36, nullable: true })
  assetId: string | null;

  @Column({
    name: "visit_material_page_id",
    type: "varchar",
    length: 36,
    nullable: true,
  })
  visitMaterialPageId: string | null;

  @Column({ type: "varchar", length: 80, nullable: true })
  errorCode: string | null;

  @Column({ type: "datetime", nullable: true })
  publishedAt: Date | null;

  @Column({ type: "varchar", length: 36 })
  requestedById: string;

  @VersionColumn()
  lockVersion: number;

  @ManyToOne(() => ContentPackageEntity, { onDelete: "CASCADE" })
  @JoinColumn({ name: "package_id" })
  contentPackage: ContentPackageEntity;

  @ManyToOne(() => ContentAssetEntity, { nullable: true, onDelete: "SET NULL" })
  @JoinColumn({ name: "asset_id" })
  asset: ContentAssetEntity | null;
}
