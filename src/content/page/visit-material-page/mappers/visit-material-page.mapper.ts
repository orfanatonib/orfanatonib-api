import { RouteEntity } from "src/infrastructure/route/route-page.entity";
import {
  MediaItemEntity,
  MediaType,
} from "src/shared/media/media-item/media-item.entity";
import { VisitMaterialsPageEntity } from "../entities/visit-material-page.entity";
import { TestamentType } from "../enums/testament-type.enum";
import {
  VisitMaterialsPageResponseDTO,
  VisitMediaItemResponseDTO,
  VisitRouteResponseDTO,
} from "../dto/visit-material-page-response.dto";

const toRouteDto = (route: RouteEntity): VisitRouteResponseDTO => ({
  id: route.id,
  path: route.path,
  title: route.title,
  subtitle: route.subtitle,
  description: route.description,
  type: route.type,
  public: route.public,
});

const toMediaDto = (item: MediaItemEntity): VisitMediaItemResponseDTO => ({
  id: item.id,
  title: item.title,
  description: item.description,
  uploadType: item.uploadType,
  mediaType: item.mediaType,
  platformType: item.platformType,
  url: item.url,
  isLocalFile: item.isLocalFile,
  size: item.size,
  originalName: item.originalName,
});

const bucket = (
  mediaItems: MediaItemEntity[],
  mediaType: MediaType,
): VisitMediaItemResponseDTO[] =>
  mediaItems.filter((item) => item.mediaType === mediaType).map(toMediaDto);

export const toVisitMaterialsPageResponseDto = (
  entity: VisitMaterialsPageEntity,
  mediaItems: MediaItemEntity[] = [],
): VisitMaterialsPageResponseDTO => ({
  id: entity.id,
  title: entity.title,
  subtitle: entity.subtitle,
  testament: entity.testament ?? TestamentType.OLD_TESTAMENT,
  description: entity.description,
  currentWeek: entity.currentWeek,
  route: toRouteDto(entity.route),
  videos: bucket(mediaItems, MediaType.VIDEO),
  documents: bucket(mediaItems, MediaType.DOCUMENT),
  images: bucket(mediaItems, MediaType.IMAGE),
  audios: bucket(mediaItems, MediaType.AUDIO),
  createdAt: entity.createdAt,
  updatedAt: entity.updatedAt,
});
