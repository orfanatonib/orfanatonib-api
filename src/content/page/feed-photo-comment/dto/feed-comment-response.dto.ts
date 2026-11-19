import { SectionAuthorDto } from "src/content/page/image-section/dto/section-author.dto";
import { toSectionAuthorDto } from "src/content/page/image-section/utils";
import { ImageSectionCommentEntity } from "../entities/image-section-comment.entity";
import { canDeleteComment } from "../utils";
import { FeedCommentActor } from "../types";

export class FeedCommentResponseDto {
  id: string;
  sectionId: string;
  content: string;
  createdAt: Date;
  /** Só o nome público; `null` se a conta foi removida. */
  author: SectionAuthorDto | null;
  /** Id do autor: apenas a moderação (admin) recebe, para moderar por autor. */
  authorId: string | null;
  isMine: boolean;
  canDelete: boolean;

  static fromEntity(
    entity: ImageSectionCommentEntity,
    actor: FeedCommentActor,
  ): FeedCommentResponseDto {
    return {
      id: entity.id,
      sectionId: entity.sectionId,
      content: entity.content,
      createdAt: entity.createdAt,
      author: toSectionAuthorDto(entity.author),
      authorId: actor.isAdmin ? entity.authorId : null,
      isMine: entity.authorId === actor.userId,
      canDelete: canDeleteComment(entity.authorId, actor),
    };
  }
}

export class PaginatedFeedCommentsResponseDto {
  items: FeedCommentResponseDto[];
  page: number;
  limit: number;
  total: number;
}
