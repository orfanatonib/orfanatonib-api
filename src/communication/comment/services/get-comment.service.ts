import { Injectable } from "@nestjs/common";
import { ResourceNotFoundException } from "src/common/exceptions";
import { COMMENT_MESSAGES } from "../constants";
import { CommentPendingCountDto } from "../dto/comment-pending-count.dto";
import { CommentEntity } from "../entities/comment.entity";
import { CommentRepository } from "../repositories/comment.repository";

@Injectable()
export class GetCommentService {
  constructor(private readonly commentRepository: CommentRepository) {}

  async findAllPublished(): Promise<CommentEntity[]> {
    return this.commentRepository.findAllPublished();
  }

  async findAll(): Promise<CommentEntity[]> {
    return this.commentRepository.findAll();
  }

  async pendingCount(): Promise<CommentPendingCountDto> {
    return { pending: await this.commentRepository.countPending() };
  }

  async findOne(id: string): Promise<CommentEntity> {
    const comment = await this.commentRepository.findById(id);
    if (!comment) {
      throw new ResourceNotFoundException(COMMENT_MESSAGES.NOT_FOUND, { id });
    }
    return comment;
  }
}
