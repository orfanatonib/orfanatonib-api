import { RouteType } from 'src/route/route-page.entity';
import { VisitMaterialsPageEntity, TestamentType } from '../entities/visit-material-page.entity';
import { Logger } from '@nestjs/common';
import { MediaItemEntity, PlatformType, MediaType, UploadType } from 'src/share/media/media-item/media-item.entity';
import { Expose } from 'class-transformer';

export class VisitMediaItemResponseDTO {
  id: string;
  title: string;
  description: string;
  uploadType: UploadType;
  mediaType: MediaType;
  platformType?: PlatformType;
  url: string;
  isLocalFile?: boolean;
  size?: number;
  originalName?: string;
}

export class VisitRouteResponseDTO {
  id: string;
  path: string;
  title: string;
  subtitle: string;
  description: string;
  type: RouteType;
  public: boolean;
}

export class VisitMaterialsPageResponseDTO {
  @Expose()
  id: string;
  @Expose()
  title: string;
  @Expose()
  subtitle: string;
  @Expose()
  testament: TestamentType;
  @Expose()
  description: string;
  @Expose()
  currentWeek: boolean;
  @Expose()
  route: VisitRouteResponseDTO;
  @Expose()
  videos: VisitMediaItemResponseDTO[];
  @Expose()
  documents: VisitMediaItemResponseDTO[];
  @Expose()
  images: VisitMediaItemResponseDTO[];
  @Expose()
  audios: VisitMediaItemResponseDTO[];
  @Expose()
  createdAt: Date;
  @Expose()
  updatedAt: Date;

  static fromEntity(
    entity: VisitMaterialsPageEntity,
    mediaItems: MediaItemEntity[] = []
  ): VisitMaterialsPageResponseDTO {
    const logger = new Logger(VisitMaterialsPageResponseDTO.name);
    logger.debug(`🧩 Convertendo entidade para DTO: ID=${entity.id}`);

    const dto = new VisitMaterialsPageResponseDTO();

    dto.id = entity.id;
    dto.title = entity.title;
    dto.subtitle = entity.subtitle;
    dto.testament = entity.testament ?? TestamentType.OLD_TESTAMENT; // Garantir que sempre tenha um valor
    dto.description = entity.description;
    dto.createdAt = entity.createdAt;
    dto.updatedAt = entity.updatedAt;
    dto.currentWeek = entity.currentWeek;

    logger.debug(`🛤️ Mapeando rota da página: ${entity.route?.path}`);
    dto.route = {
      id: entity.route.id,
      path: entity.route.path,
      title: entity.route.title,
      subtitle: entity.route.subtitle,
      description: entity.route.description,
      type: entity.route.type,
      public: entity.route.public,
    };

    const mapItem = (item: MediaItemEntity): VisitMediaItemResponseDTO => {
      logger.debug(`🎞️ Mapeando mídia: ID=${item.id}, tipo=${item.mediaType}`);
      return {
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
      };
    };

    dto.videos = mediaItems.filter((i) => i.mediaType === MediaType.VIDEO).map(mapItem);
    dto.documents = mediaItems.filter((i) => i.mediaType === MediaType.DOCUMENT).map(mapItem);
    dto.images = mediaItems.filter((i) => i.mediaType === MediaType.IMAGE).map(mapItem);
    dto.audios = mediaItems.filter((i) => i.mediaType === MediaType.AUDIO).map(mapItem);

    logger.debug(`✅ DTO criado com sucesso. ID=${dto.id}`);
    return dto;
  }
}

