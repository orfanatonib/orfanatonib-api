import {
  RouteEntity,
  RouteType,
} from "src/infrastructure/route/route-page.entity";
import { MediaItemDto } from "src/shared/dto/media-item-dto";
import { MediaTargetType } from "src/shared/media/media-target-type.enum";
import {
  MediaItemEntity,
  MediaType,
  PlatformType,
  UploadType,
} from "src/shared/media/media-item/media-item.entity";
import { VisitMaterialsPageEntity } from "./entities/visit-material-page.entity";
import { TestamentType } from "./enums/testament-type.enum";
import { CreateVisitMaterialsPageDto } from "./dto/create-visit-material-page.dto";
import { UpdateVisitMaterialsPageDto } from "./dto/update-visit-material-page.dto";

export const FIXED_CREATED_AT = new Date("2026-01-10T12:30:00.000Z");
export const FIXED_UPDATED_AT = new Date("2026-02-20T08:00:00.000Z");

export const buildRouteEntity = (
  overrides: Partial<RouteEntity> = {},
): RouteEntity =>
  Object.assign(new RouteEntity(), {
    id: "route-id",
    title: "Materiais da visita",
    subtitle: "Subtítulo",
    description: "Descrição",
    path: "materiais_visita_semana-1",
    type: RouteType.PAGE,
    public: true,
    current: false,
    image: "https://example.test/card.png",
    idToFetch: "page-id",
    entityType: "VisitMaterialsPage",
    entityId: "page-id",
    createdAt: FIXED_CREATED_AT,
    updatedAt: FIXED_UPDATED_AT,
    ...overrides,
  });

export const buildPageEntity = (
  overrides: Partial<VisitMaterialsPageEntity> = {},
): VisitMaterialsPageEntity =>
  Object.assign(new VisitMaterialsPageEntity(), {
    id: "page-id",
    title: "Materiais da visita",
    subtitle: "Subtítulo",
    description: "Descrição",
    testament: TestamentType.OLD_TESTAMENT,
    currentWeek: false,
    route: buildRouteEntity(),
    createdAt: FIXED_CREATED_AT,
    updatedAt: FIXED_UPDATED_AT,
    ...overrides,
  });

export const buildMediaEntity = (
  overrides: Partial<MediaItemEntity> = {},
): MediaItemEntity =>
  Object.assign(new MediaItemEntity(), {
    id: "media-id",
    title: "Vídeo da visita",
    description: "Descrição da mídia",
    mediaType: MediaType.VIDEO,
    uploadType: UploadType.LINK,
    platformType: PlatformType.YOUTUBE,
    url: "https://youtube.test/watch",
    isLocalFile: false,
    targetId: "page-id",
    targetType: MediaTargetType.VisitMaterialsPage,
    createdAt: FIXED_CREATED_AT,
    updatedAt: FIXED_UPDATED_AT,
    ...overrides,
  });

export const buildLinkMediaDto = (
  overrides: Partial<MediaItemDto> = {},
): MediaItemDto =>
  Object.assign(new MediaItemDto(), {
    title: "Vídeo da visita",
    description: "Descrição da mídia",
    uploadType: UploadType.LINK,
    mediaType: MediaType.VIDEO,
    isLocalFile: false,
    url: "https://youtube.test/watch",
    platformType: PlatformType.YOUTUBE,
    ...overrides,
  });

export const buildUploadMediaDto = (
  overrides: Partial<MediaItemDto> = {},
): MediaItemDto =>
  Object.assign(new MediaItemDto(), {
    title: "Documento da visita",
    description: "Descrição do documento",
    uploadType: UploadType.UPLOAD,
    mediaType: MediaType.DOCUMENT,
    isLocalFile: true,
    fieldKey: "file-0",
    ...overrides,
  });

export const buildMulterFile = (
  overrides: Partial<Express.Multer.File> = {},
): Express.Multer.File =>
  ({
    fieldname: "file-0",
    originalname: "material.pdf",
    encoding: "7bit",
    mimetype: "application/pdf",
    size: 2048,
    buffer: Buffer.from("conteudo"),
    ...overrides,
  }) as Express.Multer.File;

export const buildCreateDto = (
  overrides: Partial<CreateVisitMaterialsPageDto> = {},
): CreateVisitMaterialsPageDto =>
  Object.assign(new CreateVisitMaterialsPageDto(), {
    pageTitle: "Materiais da visita",
    pageSubtitle: "Subtítulo",
    pageDescription: "Descrição",
    ...overrides,
  });

export const buildUpdateDto = (
  overrides: Partial<UpdateVisitMaterialsPageDto> = {},
): UpdateVisitMaterialsPageDto =>
  Object.assign(new UpdateVisitMaterialsPageDto(), {
    id: "page-id",
    pageTitle: "Materiais da visita",
    pageSubtitle: "Subtítulo",
    pageDescription: "Descrição",
    currentWeek: false,
    ...overrides,
  });
