import { Injectable } from "@nestjs/common";
import { GetImageSectionService } from "src/content/page/image-section/services/get-image-section.service";
import { ImageSectionCommentRepository } from "../repositories/image-section-comment.repository";
import { CreateFeedCommentDto } from "../dto/create-feed-comment.dto";
import { FeedCommentResponseDto } from "../dto/feed-comment-response.dto";
import { FeedCommentActor } from "../types";
import { prepareCommentContent } from "../utils";
import {
  ResourceNotFoundException,
  RuleException,
} from "src/common/exceptions";
import { FEED_COMMENT_MAX_LENGTH, FEED_COMMENT_MESSAGES } from "../constants";

@Injectable()
export class CreateFeedCommentService {
  constructor(
    private readonly repository: ImageSectionCommentRepository,
    private readonly sections: GetImageSectionService,
  ) {}

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

    const saved = await this.repository.save(
      this.repository.create({ sectionId, authorId: actor.userId, content }),
    );
    const withAuthor = await this.repository.findWithAuthor(saved.id);
    if (!withAuthor) {
      throw new ResourceNotFoundException(FEED_COMMENT_MESSAGES.NOT_FOUND);
    }
    return FeedCommentResponseDto.fromEntity(withAuthor, actor);
  }
}
