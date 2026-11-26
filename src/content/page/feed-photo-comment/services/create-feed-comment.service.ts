import { Injectable } from "@nestjs/common";
import { GetImageSectionService } from "src/content/page/image-section/services/get-image-section.service";
import {
  ResourceConflictException,
  ResourceNotFoundException,
  RuleException,
  TooManyRequestsException,
} from "src/common/exceptions";
import { ImageSectionCommentRepository } from "../repositories/image-section-comment.repository";
import { ImageSectionCommentEntity } from "../entities/image-section-comment.entity";
import { CreateFeedCommentDto } from "../dto/create-feed-comment.dto";
import { FeedCommentResponseDto } from "../dto/feed-comment-response.dto";
import { FeedCommentStatus } from "../enums/feed-comment-status.enum";
import { FeedCommentActor } from "../types";
import { isDuplicateEntryError, prepareCommentContent } from "../utils";
import {
  FEED_COMMENT_MAX_LENGTH,
  FEED_COMMENT_MESSAGES,
  FEED_COMMENT_RATE_LIMIT,
  FEED_COMMENT_RATE_WINDOW_MS,
} from "../constants";
import { FeedCommentNotificationService } from "./feed-comment-notification.service";

@Injectable()
export class CreateFeedCommentService {
  constructor(
    private readonly repository: ImageSectionCommentRepository,
    private readonly sections: GetImageSectionService,
    private readonly notifications: FeedCommentNotificationService,
  ) {}

  /**
   * Todo comentário novo nasce PENDENTE. Reenviar o mesmo `requestId` com o mesmo
   * conteúdo devolve o comentário já criado (sem duplicar e sem novo e-mail).
   */
  async create(
    sectionId: string,
    actor: FeedCommentActor,
    dto: CreateFeedCommentDto,
  ): Promise<FeedCommentResponseDto> {
    // Comentar exige sessão e uma publicação que o ator enxerga.
    await this.sections.assertFeedSectionVisible(sectionId, true);

    const content = prepareCommentContent(dto.content);
    if (content.length > FEED_COMMENT_MAX_LENGTH) {
      throw new RuleException(FEED_COMMENT_MESSAGES.TOO_LONG);
    }

    const existing = await this.repository.findByRequest(
      actor.userId,
      dto.requestId,
    );
    if (existing) {
      return this.replay(existing, sectionId, content, actor);
    }

    const recent = await this.repository.countSince(
      actor.userId,
      new Date(Date.now() - FEED_COMMENT_RATE_WINDOW_MS),
    );
    if (recent >= FEED_COMMENT_RATE_LIMIT) {
      throw new TooManyRequestsException(FEED_COMMENT_MESSAGES.RATE_LIMITED);
    }

    let saved: ImageSectionCommentEntity;
    try {
      saved = await this.repository.save(
        this.repository.create({
          sectionId,
          authorId: actor.userId,
          requestId: dto.requestId,
          content,
          status: FeedCommentStatus.PENDING,
          moderationReason: null,
          moderatedById: null,
          reviewedAt: null,
        }),
      );
    } catch (error: unknown) {
      if (!isDuplicateEntryError(error)) throw error;
      // Corrida entre dois reenvios simultâneos: o outro gravou primeiro.
      const winner = await this.repository.findByRequest(
        actor.userId,
        dto.requestId,
      );
      if (!winner) throw error;
      return this.replay(winner, sectionId, content, actor);
    }

    const withAuthor = await this.repository.findWithAuthor(saved.id);
    if (!withAuthor) {
      throw new ResourceNotFoundException(FEED_COMMENT_MESSAGES.NOT_FOUND);
    }
    void this.notifications.notifyPending(withAuthor);
    return FeedCommentResponseDto.fromEntity(withAuthor, actor);
  }

  private replay(
    existing: ImageSectionCommentEntity,
    sectionId: string,
    content: string,
    actor: FeedCommentActor,
  ): FeedCommentResponseDto {
    if (existing.sectionId !== sectionId || existing.content !== content) {
      throw new ResourceConflictException(FEED_COMMENT_MESSAGES.REQUEST_REUSED);
    }
    return FeedCommentResponseDto.fromEntity(existing, actor);
  }
}
