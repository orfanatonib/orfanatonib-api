import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { UserModule } from "src/core/user/user.module";
import { CommentController } from "./comment.controller";
import { CommentEntity } from "./entities/comment.entity";
import { CommentRepository } from "./repositories/comment.repository";
import { CreateCommentService } from "./services/create-comment.service";
import { DeleteCommentService } from "./services/delete-comment.service";
import { GetCommentService } from "./services/get-comment.service";
import { UpdateCommentService } from "./services/update-comment.service";

@Module({
  imports: [TypeOrmModule.forFeature([CommentEntity]), UserModule],
  controllers: [CommentController],
  providers: [
    CommentRepository,
    CreateCommentService,
    GetCommentService,
    UpdateCommentService,
    DeleteCommentService,
  ],
})
export class CommentModule {}
