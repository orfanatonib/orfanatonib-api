import { MediaItemEntity } from "src/shared/media/media-item/media-item.entity";
import { ImageSectionEntity } from "../entities/image-section.entity";
import { ImageSectionDto } from "./image-page-response.dto";
import { SectionAuthorDto } from "src/content/page/image-section/dto/section-author.dto";
import { toSectionAuthorDto } from "src/content/page/image-section/utils";
import { EMPTY_FEED_EXTRAS, FeedSectionExtras } from "../types";
import { ImagePageEntity } from "../entities/image-page.entity";

/** Publicação do feed: seção + autoria, celebrações e comentários. */
export class FeedImageSectionDto extends ImageSectionDto {
  /** `null` = "Autor não informado" (seção antiga) ou visitante (privacidade). */
  author: SectionAuthorDto | null;
  celebrationCount: number;
  celebratedByMe: boolean;
  /** Só quem tem sessão vê comentários; visitante recebe 0. */
  commentCount: number;

  static fromFeed(
    section: ImageSectionEntity,
    mediaItems: MediaItemEntity[],
    extras: FeedSectionExtras,
  ): FeedImageSectionDto {
    return {
      ...ImageSectionDto.fromEntity(section, mediaItems),
      author: extras.showAuthor ? toSectionAuthorDto(section.author) : null,
      celebrationCount: extras.celebrationCount,
      celebratedByMe: extras.celebratedByMe,
      commentCount: extras.commentCount,
    };
  }
}

export class PaginatedImageSectionResponseDto {
  id: string;
  title: string;
  description: string;
  public: boolean;
  createdAt: Date;
  updatedAt: Date;
  sections: FeedImageSectionDto[];
  page: number;
  limit: number;
  total: number;

  static fromEntities(
    pageEntity: ImagePageEntity,
    sections: ImageSectionEntity[],
    mediaMap: Map<string, MediaItemEntity[]>,
    extrasById: Map<string, FeedSectionExtras>,
    page: number,
    limit: number,
    total: number,
  ): PaginatedImageSectionResponseDto {
    return {
      id: pageEntity.id,
      title: pageEntity.name,
      description: pageEntity.description,
      public: pageEntity.public,
      createdAt: pageEntity.createdAt,
      updatedAt: pageEntity.updatedAt,

      sections: sections.map((section) =>
        FeedImageSectionDto.fromFeed(
          section,
          mediaMap.get(section.id) || [],
          extrasById.get(section.id) ?? EMPTY_FEED_EXTRAS,
        ),
      ),
      page,
      limit,
      total,
    };
  }
}
