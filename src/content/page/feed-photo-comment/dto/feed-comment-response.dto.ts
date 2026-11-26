import { SectionAuthorDto } from "src/content/page/image-section/dto/section-author.dto";
import { FeedSectionContextDto } from "src/content/page/image-section/dto/feed-section-context.dto";
import { toSectionAuthorDto } from "src/content/page/image-section/utils";
import { ImageSectionCommentEntity } from "../entities/image-section-comment.entity";
import { FeedCommentStatus } from "../enums/feed-comment-status.enum";
import { canDeleteComment } from "../utils";
import { FeedCommentActor } from "../types";

export class FeedCommentResponseDto {
  id: string;
  sectionId: string;
  content: string;
  createdAt: Date;
  status: FeedCommentStatus;
  /** Motivo da reprovação: só o autor e a moderação recebem; `null` nos demais. */
  moderationReason: string | null;
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
    const isMine = entity.authorId === actor.userId;
    return {
      id: entity.id,
      sectionId: entity.sectionId,
      content: entity.content,
      createdAt: entity.createdAt,
      status: entity.status,
      moderationReason:
        isMine || actor.isAdmin ? entity.moderationReason : null,
      author: toSectionAuthorDto(entity.author),
      authorId: actor.isAdmin ? entity.authorId : null,
      isMine,
      canDelete: canDeleteComment(entity.authorId, actor),
    };
  }
}

/** Item da fila do admin: o comentário + a publicação de contexto e quem decidiu. */
export class ModerationFeedCommentResponseDto extends FeedCommentResponseDto {
  post: FeedSectionContextDto | null;
  reviewedAt: Date | null;
  moderatedByName: string | null;

  static fromModeration(
    entity: ImageSectionCommentEntity,
    actor: FeedCommentActor,
    post: FeedSectionContextDto | null,
  ): ModerationFeedCommentResponseDto {
    return {
      ...FeedCommentResponseDto.fromEntity(entity, actor),
      post,
      reviewedAt: entity.reviewedAt,
      moderatedByName:
        toSectionAuthorDto(entity.moderatedBy)?.displayName ?? null,
    };
  }
}

export class PaginatedFeedCommentsResponseDto {
  items: FeedCommentResponseDto[];
  page: number;
  limit: number;
  total: number;
}

export class PaginatedModerationFeedCommentsResponseDto {
  items: ModerationFeedCommentResponseDto[];
  /** Total geral por status, sem os filtros da consulta (contagem das abas). */
  counts: Record<FeedCommentStatus, number>;
  page: number;
  limit: number;
  total: number;
}

export class FeedCommentPendingCountResponseDto {
  pending: number;
}
