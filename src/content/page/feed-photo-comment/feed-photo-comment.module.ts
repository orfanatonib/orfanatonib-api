import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { DataSource } from "typeorm";
import { ImageSectionModule } from "../image-section/image-section.module";
import { ImageSectionCommentEntity } from "./entities/image-section-comment.entity";
import { ImageSectionCommentRepository } from "./repositories/image-section-comment.repository";
import { FeedPhotoCommentController } from "./feed-photo-comment.controller";
import { CreateFeedCommentService } from "./services/create-feed-comment.service";
import { DeleteFeedCommentService } from "./services/delete-feed-comment.service";
import { GetFeedCommentService } from "./services/get-feed-comment.service";

@Module({
  imports: [
    TypeOrmModule.forFeature([ImageSectionCommentEntity]),
    ImageSectionModule,
  ],
  controllers: [FeedPhotoCommentController],
  providers: [
    {
      provide: ImageSectionCommentRepository,
      useFactory: (dataSource: DataSource) =>
        new ImageSectionCommentRepository(dataSource),
      inject: [DataSource],
    },
    CreateFeedCommentService,
    DeleteFeedCommentService,
    GetFeedCommentService,
  ],
  exports: [GetFeedCommentService],
})
export class FeedPhotoCommentModule {}
