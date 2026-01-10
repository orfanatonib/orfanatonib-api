import { RouteEntity } from 'src/infrastructure/route/route-page.entity';
import {
  MediaItemEntity,
  PlatformType,
  MediaType,
  UploadType,
} from 'src/shared/media/media-item/media-item.entity';
import { IdeasSectionEntity } from '../../ideas-section/entites/ideas-section.entity';
import { IdeasPageEntity } from '../entities/ideas-page.entity';

export class IdeasRouteDto {
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

  static fromEntity(route: RouteEntity): IdeasRouteDto {
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

export class IdeasMediaItemResponseDto {
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

  static fromEntity(ent: MediaItemEntity): IdeasMediaItemResponseDto {
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

export class IdeasSectionUserDto {
  email: string;
  phone: string;
  name: string;
}

function formatUserName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[parts.length - 1]}`;
}

export class IdeasSectionResponseDto {
  id: string;
  title: string;
  description: string;
  public: boolean;
  createdAt: Date;
  updatedAt: Date;
  medias: IdeasMediaItemResponseDto[];
  user?: IdeasSectionUserDto;

  static fromEntity(
    section: IdeasSectionEntity,
    mediaItems: MediaItemEntity[],
  ): IdeasSectionResponseDto {
    return {
      id: section.id,
      title: section.title,
      description: section.description,
      public: section.public,
      createdAt: section.createdAt,
      updatedAt: section.updatedAt,
      medias: mediaItems.map(IdeasMediaItemResponseDto.fromEntity),
      user: section.user ? {
        email: section.user.email,
        phone: section.user.phone,
        name: formatUserName(section.user.name),
      } : undefined,
    };
  }
}

export class IdeasPageResponseDto {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  public: boolean;
  createdAt: Date;
  updatedAt: Date;
  route: IdeasRouteDto;
  sections: IdeasSectionResponseDto[];


  static fromEntity(
    page: IdeasPageEntity,
    mediaMap: Map<string, MediaItemEntity[]>,
  ): IdeasPageResponseDto {
    if (!page.route) {
      throw new Error(
        `Página de ideias id=${page.id} não possui rota associada.`,
      );
    }

    return {
      id: page.id,
      title: page.title,
      subtitle: page.subtitle || '',
      description: page.description,
      public: page.public,
      createdAt: page.createdAt,
      updatedAt: page.updatedAt,
      route: IdeasRouteDto.fromEntity(page.route),
      sections: page.sections.map((s) =>
        IdeasSectionResponseDto.fromEntity(s, mediaMap.get(s.id) || []),
      ),
    };
  }
}
