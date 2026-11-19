import { Injectable, Logger } from "@nestjs/common";
import {
  ResourceConflictException,
  ResourceNotFoundException,
} from "src/common/exceptions";
import { ImageSectionCommentRepository } from "../repositories/image-section-comment.repository";
import { ImageSectionCommentEntity } from "../entities/image-section-comment.entity";
import { FeedCommentResponseDto } from "../dto/feed-comment-response.dto";
import { FeedCommentStatus } from "../enums/feed-comment-status.enum";
import { FEED_COMMENT_MESSAGES } from "../constants";
import { FeedCommentActor } from "../types";
import { FeedCommentNotificationService } from "./feed-comment-notification.service";

type Decision = FeedCommentStatus.APPROVED | FeedCommentStatus.REJECTED;

@Injectable()
export class UpdateFeedCommentService {
  private readonly logger = new Logger(UpdateFeedCommentService.name);

  constructor(
    private readonly repository: ImageSectionCommentRepository,
    private readonly notifications: FeedCommentNotificationService,
  ) {}

  approve(
    commentId: string,
    actor: FeedCommentActor,
  ): Promise<FeedCommentResponseDto> {
    return this.decide(commentId, actor, FeedCommentStatus.APPROVED, null);
  }

  reject(
    commentId: string,
    actor: FeedCommentActor,
    reason: string,
  ): Promise<FeedCommentResponseDto> {
    return this.decide(commentId, actor, FeedCommentStatus.REJECTED, reason);
  }

  /**
   * Só um PENDENTE muda de estado. Repetir a mesma decisão é idempotente (devolve o
   * comentário, sem novo e-mail); a decisão contrária sobre um já moderado é 409.
   */
  private async decide(
    commentId: string,
    actor: FeedCommentActor,
    status: Decision,
    reason: string | null,
  ): Promise<FeedCommentResponseDto> {
    const current = await this.require(commentId);
    if (current.status !== FeedCommentStatus.PENDING) {
      return this.alreadyDecided(current, status, actor);
    }

    const changed = await this.repository.decide(commentId, status, {
      moderatorId: actor.userId,
      reason,
    });
    const updated = await this.require(commentId);
    if (!changed) {
      // Outro moderador decidiu entre a leitura e a escrita.
      return this.alreadyDecided(updated, status, actor);
    }

    // Só ids no log: o texto pode conter dado de criança/família.
    this.logger.log(`Feed comment ${commentId} ${status} by ${actor.userId}`);
    void (status === FeedCommentStatus.APPROVED
      ? this.notifications.notifyApproved(updated)
      : this.notifications.notifyRejected(updated));
    return FeedCommentResponseDto.fromEntity(updated, actor);
  }

  private alreadyDecided(
    comment: ImageSectionCommentEntity,
    wanted: Decision,
    actor: FeedCommentActor,
  ): FeedCommentResponseDto {
    if (comment.status !== wanted) {
      throw new ResourceConflictException(
        FEED_COMMENT_MESSAGES.ALREADY_DECIDED,
      );
    }
    return FeedCommentResponseDto.fromEntity(comment, actor);
  }

  private async require(commentId: string): Promise<ImageSectionCommentEntity> {
    const comment = await this.repository.findWithAuthor(commentId);
    if (!comment) {
      throw new ResourceNotFoundException(FEED_COMMENT_MESSAGES.NOT_FOUND);
    }
    return comment;
  }
}
