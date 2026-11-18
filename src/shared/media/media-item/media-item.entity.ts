import { BaseEntity } from "src/shared/entity/base.entity";
import { Entity, Column } from "typeorm";

export enum MediaType {
  VIDEO = "video",
  DOCUMENT = "document",
  IMAGE = "image",
  AUDIO = "audio",
}

export enum UploadType {
  LINK = "link",
  UPLOAD = "upload",
}

export enum PlatformType {
  YOUTUBE = "youtube",
  GOOGLE_DRIVE = "googledrive",
  ONEDRIVE = "onedrive",
  DROPBOX = "dropbox",
  ANY = "ANY",
}

@Entity("media_items")
export class MediaItemEntity extends BaseEntity {
  @Column()
  title: string;

  @Column({ type: "text" })
  description: string;

  @Column({
    type: "enum",
    enum: MediaType,
  })
  mediaType: MediaType;

  @Column({
    type: "enum",
    enum: UploadType,
  })
  uploadType: UploadType;

  @Column({
    type: "enum",
    enum: PlatformType,
    nullable: true,
  })
  platformType?: PlatformType;

  @Column()
  url: string;

  @Column({ default: false })
  isLocalFile: boolean;

  @Column({ nullable: true })
  originalName?: string;

  @Column({ nullable: true })
  size?: number;

  /** Chave do objeto no S3 (nula em registros antigos: extrair da URL). */
  @Column({ type: "varchar", length: 512, nullable: true })
  storageKey?: string | null;

  @Column()
  targetId: string;

  @Column()
  targetType: string;
}
