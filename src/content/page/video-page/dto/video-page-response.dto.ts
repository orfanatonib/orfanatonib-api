import {
  MediaItemEntity,
  MediaType,
  PlatformType,
  UploadType,
} from "src/shared/media/media-item/media-item.entity";
import { RouteEntity } from "src/infrastructure/route/route-page.entity";
import { VideosPage } from "../entities/video-page.entity";

export class VideoRouteDto {
  title: string;
  public: boolean;
  subtitle: string;
  image: string;
  idToFetch: string;
  path: string;
  entityType: string;
  description: string;
  entityId: string;
  type: string;

  static fromEntity(route: RouteEntity): VideoRouteDto {
    return {
      title: route.title,
      public: route.public,
      subtitle: route.subtitle,
      image: route.image,
      idToFetch: route.idToFetch,
      path: route.path,
      entityType: route.entityType,
      description: route.description,
      entityId: route.entityId,
      type: route.type,
    };
  }
}

/**
 * Vídeo da página como a API o devolve: só os campos que o app consome. Não vaza
 * `storageKey` (chave interna do bucket), `targetId` nem `targetType`.
 */
export class VideoMediaResponseDto {
  id: string;
  title: string;
  description: string;
  mediaType: MediaType;
  uploadType: UploadType;
  platformType?: PlatformType;
  url: string;
  isLocalFile: boolean;
  originalName?: string;
  size?: number;
  createdAt: Date;
  updatedAt: Date;

  static fromEntity(ent: MediaItemEntity): VideoMediaResponseDto {
    return {
      id: ent.id,
      title: ent.title,
      description: ent.description,
      mediaType: ent.mediaType,
      uploadType:
        ent.uploadType ||
        (ent.isLocalFile ? UploadType.UPLOAD : UploadType.LINK),
      platformType: ent.platformType || undefined,
      url: ent.url,
      isLocalFile: ent.isLocalFile,
      originalName: ent.originalName || undefined,
      size: ent.size || undefined,
      createdAt: ent.createdAt,
      updatedAt: ent.updatedAt,
    };
  }
}

export class VideosPageResponseDto {
  id: string;
  title: string;
  description: string;
  public: boolean;
  createdAt: Date;
  updatedAt: Date;
  route: VideoRouteDto;
  videos: VideoMediaResponseDto[];

  static fromEntity(
    page: VideosPage,
    videos: MediaItemEntity[],
  ): VideosPageResponseDto {
    if (!page.route) {
      throw new Error(
        `A página de vídeos com id ${page.id} não possui rota associada.`,
      );
    }

    return {
      id: page.id,
      title: page.name,
      description: page.description,
      public: page.public,
      createdAt: page.createdAt,
      updatedAt: page.updatedAt,
      route: VideoRouteDto.fromEntity(page.route),
      videos: videos.map((video) => VideoMediaResponseDto.fromEntity(video)),
    };
  }
}
