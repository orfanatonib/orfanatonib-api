import { MediaItemDto } from "src/shared/dto/media-item-dto";
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
