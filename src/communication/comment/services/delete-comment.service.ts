import { Injectable } from "@nestjs/common";
import { CommentRepository } from "../repositories/comment.repository";
import { GetCommentService } from "./get-comment.service";

@Injectable()
export class DeleteCommentService {
  constructor(
    private readonly commentRepository: CommentRepository,
    private readonly getCommentService: GetCommentService,
  ) {}

  async execute(id: string): Promise<void> {
    const comment = await this.getCommentService.findOne(id);
    await this.commentRepository.removeComment(comment);
  }
}
