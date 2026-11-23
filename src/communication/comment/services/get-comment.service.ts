import { Injectable } from "@nestjs/common";
import { ResourceNotFoundException } from "src/common/exceptions";
import { COMMENT_MESSAGES } from "../constants";
import { CommentPendingCountDto } from "../dto/comment-pending-count.dto";
import { CommentEntity } from "../entities/comment.entity";
import { CommentListQueryDto } from "../dto/comment-list-query.dto";
import { CommentSortBy } from "../enums/comment-sort-by.enum";
import { PaginatedResponseDto } from "src/shared/dto/paginated-response.dto";
import {
  isPaginated,
  toPaginated,
} from "src/shared/list-query/list-query.util";
import { CommentRepository } from "../repositories/comment.repository";

@Injectable()
export class GetCommentService {
  constructor(private readonly commentRepository: CommentRepository) {}

  async findAllPublished(): Promise<CommentEntity[]> {
    return this.commentRepository.findAllPublished();
  }

  async findAll(
    query?: CommentListQueryDto,
  ): Promise<CommentEntity[] | PaginatedResponseDto<CommentEntity>> {
    if (!query) return this.commentRepository.findAll();
    const { items, total } = await this.commentRepository.findFiltered(query);
    if (isPaginated(query)) {
      return toPaginated(
        items,
        query,
        total,
        query.sortBy ?? CommentSortBy.CREATED_AT,
      );
    }
    return items;
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
