import type { EntityManager } from "typeorm";
import { MediaItemDto } from "src/shared/dto/media-item-dto";
import type { UploadBatch } from "src/shared/media/storage/upload-batch";
import { VisitMaterialSectionEntity } from "./entities/visit-material-section.entity";
import {
  MediaItemEntity,
  MediaType,
} from "src/shared/media/media-item/media-item.entity";

/** Uploaded files indexed by their multipart field name. */
export type UploadedFilesDict = Record<string, Express.Multer.File>;

/** The media a request carries, split by bucket. */
export interface VisitMaterialMediaBuckets {
  videos: MediaItemDto[];
  documents: MediaItemDto[];
  images: MediaItemDto[];
  audios: MediaItemDto[];
}

/** Media already stored for a page, grouped by type. */
export type StoredMediaByType = ReadonlyMap<MediaType, MediaItemEntity[]>;

/** Fields the route mirrors from the page it points to. */
export interface VisitMaterialRouteInput {
  title: string;
  subtitle: string;
  description: string;
  pageId: string;
  public: boolean;
  current?: boolean;
}

/** Seção já gravada com as mídias dela. */
export interface VisitMaterialSectionWithMedia {
  section: VisitMaterialSectionEntity;
  media: MediaItemEntity[];
}

/**
 * Uma edição inteira da página: o que ela grava vai na mesma transação (`manager`), os arquivos novos
 * entram no `batch` (descartável se algo falhar) e os arquivos antigos só saem do bucket DEPOIS do
 * commit (`obsoleteUrls`). Se qualquer passo falha, o banco volta e o bucket fica como estava.
 */
export interface VisitMaterialWriteUnit {
  readonly manager: EntityManager;
  readonly batch: UploadBatch;
  readonly obsoleteUrls: string[];
}
