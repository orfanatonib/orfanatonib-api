import { Injectable } from "@nestjs/common";
import { UpdateCommentDto } from "../dto/update-comment.dto";
import { CommentEntity } from "../entities/comment.entity";
import { CommentRepository } from "../repositories/comment.repository";
import { GetCommentService } from "./get-comment.service";

@Injectable()
export class UpdateCommentService {
  constructor(
    private readonly commentRepository: CommentRepository,
    private readonly getCommentService: GetCommentService,
  ) {}

  async execute(id: string, dto: UpdateCommentDto): Promise<CommentEntity> {
    const comment = await this.getCommentService.findOne(id);
    return this.commentRepository.updateAndSave(comment, dto);
  }
}
