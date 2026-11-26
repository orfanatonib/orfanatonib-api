import { Injectable, Logger } from "@nestjs/common";
import {
  AccessDeniedException,
  ResourceNotFoundException,
} from "src/common/exceptions";
import { ImageSectionCommentRepository } from "../repositories/image-section-comment.repository";
import { FEED_COMMENT_MESSAGES } from "../constants";
import { FeedCommentActor } from "../types";
import { canDeleteComment } from "../utils";

@Injectable()
export class DeleteFeedCommentService {
  private readonly logger = new Logger(DeleteFeedCommentService.name);

  constructor(private readonly repository: ImageSectionCommentRepository) {}

  /** Autor remove o seu; admin remove qualquer um (moderação). */
  async remove(commentId: string, actor: FeedCommentActor): Promise<void> {
    const comment = await this.repository.findOneBy({ id: commentId });
    if (!comment) {
      throw new ResourceNotFoundException(FEED_COMMENT_MESSAGES.NOT_FOUND);
    }
    if (!canDeleteComment(comment.authorId, actor)) {
      throw new AccessDeniedException(FEED_COMMENT_MESSAGES.FORBIDDEN_DELETE);
    }
    await this.repository.delete({ id: commentId });
    // Só ids no log: o texto pode conter dado de criança/família.
    this.logger.log(
      `Feed comment ${commentId} removed (moderation=${actor.isAdmin && comment.authorId !== actor.userId})`,
    );
  }
}
