import { UserEntity } from "src/core/user/entities/user.entity";
import { MediaTargetType } from "src/shared/media/media-target-type.enum";
import {
  MediaItemEntity,
  MediaType,
  PlatformType,
  UploadType,
} from "src/shared/media/media-item/media-item.entity";

import { IdeasPageEntity } from "../ideas-page/entities/ideas-page.entity";
import { IdeasSectionMediaItemDto } from "./dto/ideas-section-media-item.dto";
import { IdeasSectionEntity } from "./entities/ideas-section.entity";
import { IdeasSectionMediaType } from "./enums/ideas-section-media-type.enum";

export const FIXED_CREATED_AT = new Date("2026-01-10T12:30:00.000Z");
export const FIXED_UPDATED_AT = new Date("2026-02-20T08:00:00.000Z");

export const buildUser = (overrides: Partial<UserEntity> = {}): UserEntity =>
  Object.assign(new UserEntity(), {
    id: "user-id",
    name: "Maria Clara dos Santos",
    email: "maria@exemplo.test",
    phone: "92999990000",
    ...overrides,
  });

export const buildPage = (
  overrides: Partial<IdeasPageEntity> = {},
): IdeasPageEntity =>
  Object.assign(new IdeasPageEntity(), {
    id: "page-id",
    title: "Página de ideias",
    ...overrides,
  });

export const buildSection = (
  overrides: Partial<IdeasSectionEntity> = {},
): IdeasSectionEntity =>
  Object.assign(new IdeasSectionEntity(), {
    id: "section-id",
    title: "Brincadeira do paraquedas",
    description: "Como conduzir a dinâmica",
    public: true,
    user: buildUser(),
    createdAt: FIXED_CREATED_AT,
    updatedAt: FIXED_UPDATED_AT,
    ...overrides,
  });

export const buildMediaEntity = (
  overrides: Partial<MediaItemEntity> = {},
): MediaItemEntity =>
  Object.assign(new MediaItemEntity(), {
    id: "media-id",
    title: "Foto",
    description: "",
    mediaType: MediaType.IMAGE,
    uploadType: UploadType.UPLOAD,
    isLocalFile: true,
    url: "https://bucket.test/foto.png",
    originalName: "foto.png",
    size: 1024,
    targetId: "section-id",
    targetType: MediaTargetType.IdeasSection,
    createdAt: FIXED_CREATED_AT,
    updatedAt: FIXED_UPDATED_AT,
    ...overrides,
  });

export const buildUploadMediaDto = (
  overrides: Partial<IdeasSectionMediaItemDto> = {},
): IdeasSectionMediaItemDto =>
  Object.assign(new IdeasSectionMediaItemDto(), {
    uploadType: UploadType.UPLOAD,
    mediaType: IdeasSectionMediaType.IMAGE,
    isLocalFile: true,
    fieldKey: "image_upload",
    title: "Foto",
    ...overrides,
  });

export const buildLinkMediaDto = (
  overrides: Partial<IdeasSectionMediaItemDto> = {},
): IdeasSectionMediaItemDto =>
  Object.assign(new IdeasSectionMediaItemDto(), {
    uploadType: UploadType.LINK,
    mediaType: IdeasSectionMediaType.VIDEO,
    isLocalFile: false,
    url: "https://youtu.be/abc",
    platformType: PlatformType.YOUTUBE,
    title: "Vídeo",
    ...overrides,
  });

export const buildFile = (
  overrides: Partial<Express.Multer.File> = {},
): Express.Multer.File =>
  ({
    fieldname: "image_upload",
    originalname: "foto.png",
    size: 1024,
    buffer: Buffer.from("conteudo"),
    ...overrides,
  }) as Express.Multer.File;
