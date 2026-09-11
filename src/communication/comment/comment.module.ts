import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { UserModule } from "src/core/user/user.module";
import { CommentService } from "./comment.service";
import { CommentController } from "./comment.controller";
import { CommentEntity } from "./entity/comment.entity";
import { CommentRepository } from "./repository/comment.repository";

@Module({
  imports: [TypeOrmModule.forFeature([CommentEntity]), UserModule],
  controllers: [CommentController],
  providers: [CommentService, CommentRepository],
})
export class CommentModule {}
