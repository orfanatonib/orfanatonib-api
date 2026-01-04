import { IdeasSectionEntity } from 'src/content/page/ideas-section/entites/ideas-section.entity';
import { MediaItemEntity } from 'src/shared/media/media-item/media-item.entity';
import { MediaItemDto } from 'src/shared/dto/media-item-dto';

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
  medias: MediaItemDto[];
  user?: IdeasSectionUserDto;

  static fromEntity(section: IdeasSectionEntity, medias: MediaItemEntity[]): IdeasSectionResponseDto {
    return {
      id: section.id,
      title: section.title,
      description: section.description,
      public: section.public,
      createdAt: section.createdAt,
      updatedAt: section.updatedAt,
      medias: medias.map((item) => ({
        id: item.id,
        title: item.title,
        description: item.description,
        uploadType: item.uploadType,
        mediaType: item.mediaType,
        isLocalFile: item.isLocalFile,
        url: item.url,
        platformType: item.platformType,
        originalName: item.originalName,
        size: item.size,
        fieldKey: undefined,
      })),
      user: section.user ? {
        email: section.user.email,
        phone: section.user.phone,
        name: formatUserName(section.user.name),
      } : undefined,
    };
  }
}
