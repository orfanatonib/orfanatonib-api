import { toFullDisplayName } from "src/common/utils/display-name.util";
import type { UserEntity } from "src/core/user/entities/user.entity";
import { SectionAuthorDto } from "./dto/section-author.dto";
import { FeedSectionContextDto } from "./dto/feed-section-context.dto";
import type { ImageSectionEntity } from "src/content/page/image-page/entities/image-section.entity";
import type { MediaItemEntity } from "src/shared/media/media-item/media-item.entity";

/**
 * Converte a relação `author` no DTO do feed (nome completo de quem publicou, como no Clubinho). Seção antiga (sem autor), conta
 * removida ou relação não carregada → `null` ("Autor não informado" no app).
 */
export const toSectionAuthorDto = (
  author: Pick<UserEntity, "name"> | null | undefined,
): SectionAuthorDto | null => {
  const displayName = toFullDisplayName(author?.name);
  return displayName ? { displayName } : null;
};

/** Legenda + primeira mídia da publicação (`media` pode trazer mídias de outras publicações). */
export const toFeedSectionContext = (
  section: Pick<ImageSectionEntity, "id" | "caption">,
  media: readonly MediaItemEntity[],
): FeedSectionContextDto => {
  const own = media.filter((item) => item.targetId === section.id);
  const first = own[0];
  return {
    id: section.id,
    caption: section.caption,
    mediaCount: own.length,
    cover: first
      ? {
          id: first.id,
          title: first.title,
          description: first.description,
          uploadType: first.uploadType,
          mediaType: first.mediaType,
          isLocalFile: first.isLocalFile,
          url: first.url,
          platformType: first.platformType,
        }
      : null,
  };
};
