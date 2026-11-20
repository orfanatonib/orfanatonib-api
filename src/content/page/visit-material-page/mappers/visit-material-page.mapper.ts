import { RouteEntity } from "src/infrastructure/route/route-page.entity";
import {
  MediaItemEntity,
  MediaType,
} from "src/shared/media/media-item/media-item.entity";
import { VISIT_MATERIAL_ROUTE_CARD_IMAGE_URL } from "../constants";
import { VisitMaterialsPageEntity } from "../entities/visit-material-page.entity";
import { TestamentType } from "../enums/testament-type.enum";
import { VISIT_MATERIAL_CATEGORY_ORDER } from "../enums/visit-material-category.enum";
import type { VisitMaterialSectionWithMedia } from "../types";
import {
  VisitMaterialSectionResponseDTO,
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

const coverImageOf = (route: RouteEntity): string | null =>
  route.image && route.image !== VISIT_MATERIAL_ROUTE_CARD_IMAGE_URL
    ? route.image
    : null;

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

const toSectionDto = ({
  section,
  media,
}: VisitMaterialSectionWithMedia): VisitMaterialSectionResponseDTO => ({
  id: section.id,
  category: section.category,
  title: section.title ?? null,
  description: section.description ?? null,
  position: section.position,
  videos: bucket(media, MediaType.VIDEO),
  documents: bucket(media, MediaType.DOCUMENT),
  images: bucket(media, MediaType.IMAGE),
  audios: bucket(media, MediaType.AUDIO),
});

/** Seções na ordem fixa das categorias (da faixa mais nova para a mais velha). */
const sortedSections = (
  sections: readonly VisitMaterialSectionWithMedia[],
): VisitMaterialSectionResponseDTO[] =>
  [...sections]
    .sort(
      (a, b) =>
        VISIT_MATERIAL_CATEGORY_ORDER.indexOf(a.section.category) -
        VISIT_MATERIAL_CATEGORY_ORDER.indexOf(b.section.category),
    )
    .map(toSectionDto);

export const toVisitMaterialsPageResponseDto = (
  entity: VisitMaterialsPageEntity,
  mediaItems: MediaItemEntity[] = [],
  sections: readonly VisitMaterialSectionWithMedia[] = [],
): VisitMaterialsPageResponseDTO => ({
  id: entity.id,
  title: entity.title,
  subtitle: entity.subtitle,
  testament: entity.testament ?? TestamentType.OLD_TESTAMENT,
  description: entity.description,
  currentWeek: entity.currentWeek,
  route: toRouteDto(entity.route),
  coverImageUrl: coverImageOf(entity.route),
  sections: sortedSections(sections),
  videos: bucket(mediaItems, MediaType.VIDEO),
  documents: bucket(mediaItems, MediaType.DOCUMENT),
  images: bucket(mediaItems, MediaType.IMAGE),
  audios: bucket(mediaItems, MediaType.AUDIO),
  createdAt: entity.createdAt,
  updatedAt: entity.updatedAt,
});
