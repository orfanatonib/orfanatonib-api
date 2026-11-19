import { ImageSectionEntity } from "src/content/page/image-page/entities/image-section.entity";
import { MediaItemEntity } from "src/shared/media/media-item/media-item.entity";
import { MediaItemDto } from "src/shared/dto/media-item-dto";
import { SectionAuthorDto } from "./section-author.dto";
import { toSectionAuthorDto } from "../utils";

export class ImageSectionResponseDto {
  id: string;
  caption: string;
  description: string;
  public: boolean;
  createdAt: Date;
  updatedAt: Date;
  mediaItems: MediaItemDto[];
  /** Id do autor: só a moderação (admin) recebe. `null` = autoria desconhecida. */
  authorId: string | null;
  author: SectionAuthorDto | null;

  static fromEntity(
    section: ImageSectionEntity,
    mediaItems: MediaItemEntity[],
  ): ImageSectionResponseDto {
    return {
      id: section.id,
      caption: section.caption,
      description: section.description,
      public: section.public,
      createdAt: section.createdAt,
      updatedAt: section.updatedAt,
      authorId: section.author?.id ?? null,
      author: toSectionAuthorDto(section.author),
      mediaItems: mediaItems.map((item) => ({
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
      })),
    };
  }
}
