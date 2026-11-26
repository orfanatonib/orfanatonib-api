import { BaseEntity } from "src/shared/entity/base.entity";
import { Column, Entity, Index, JoinColumn, ManyToOne } from "typeorm";

import { ContentAssetKind } from "../enums/content-asset-kind.enum";
import { ContentPackageEntity } from "./content-package.entity";
import { ContentStageEntity } from "./content-stage.entity";
import { ContentVersionEntity } from "./content-version.entity";

@Entity("content_assets")
@Index(["packageId", "stageId"])
@Index(["versionId", "slot"])
export class ContentAssetEntity extends BaseEntity {
  @Column({ name: "package_id", type: "varchar", length: 36 })
  packageId: string;

  @Column({ name: "stage_id", type: "varchar", length: 36, nullable: true })
  stageId: string | null;

  @Column({ name: "version_id", type: "varchar", length: 36, nullable: true })
  versionId: string | null;

  @Column({ type: "enum", enum: ContentAssetKind })
  kind: ContentAssetKind;

  /** Item do conteúdo a que a imagem pertence (visual-01, verso-02, compilado-01…); vazio nos demais arquivos. */
  @Column({ type: "varchar", length: 60, nullable: true })
  slot: string | null;

  @Index({ unique: true })
  @Column({ type: "varchar", length: 500 })
  storageKey: string;

  @Column({ type: "varchar", length: 120 })
  mediaType: string;

  @Column({ type: "bigint", unsigned: true })
  sizeBytes: string;

  @Column({ type: "char", length: 64 })
  checksum: string;

  @ManyToOne(() => ContentPackageEntity, { onDelete: "CASCADE" })
  @JoinColumn({ name: "package_id" })
  contentPackage: ContentPackageEntity;

  @ManyToOne(() => ContentStageEntity, { nullable: true, onDelete: "SET NULL" })
  @JoinColumn({ name: "stage_id" })
  stage: ContentStageEntity | null;

  @ManyToOne(() => ContentVersionEntity, {
    nullable: true,
    onDelete: "SET NULL",
  })
  @JoinColumn({ name: "version_id" })
  version: ContentVersionEntity | null;
}
