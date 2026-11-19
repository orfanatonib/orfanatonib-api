import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { DataSource } from "typeorm";
import { AuthModule } from "src/core/auth/auth.module";
import { ImageSectionModule } from "../image-section/image-section.module";
import { ImageSectionCelebrationEntity } from "./entities/image-section-celebration.entity";
import { ImageSectionCelebrationRepository } from "./repositories/image-section-celebration.repository";
import { FeedCelebrationController } from "./feed-celebration.controller";
import { CreateCelebrationService } from "./services/create-celebration.service";
import { DeleteCelebrationService } from "./services/delete-celebration.service";
import { GetCelebrationService } from "./services/get-celebration.service";
import { UpdateCelebrationService } from "./services/update-celebration.service";

@Module({
  imports: [
    TypeOrmModule.forFeature([ImageSectionCelebrationEntity]),
    ImageSectionModule,
    AuthModule,
  ],
  controllers: [FeedCelebrationController],
  providers: [
    {
      provide: ImageSectionCelebrationRepository,
      useFactory: (dataSource: DataSource) =>
        new ImageSectionCelebrationRepository(dataSource),
      inject: [DataSource],
    },
    CreateCelebrationService,
    DeleteCelebrationService,
    GetCelebrationService,
    UpdateCelebrationService,
  ],
  exports: [GetCelebrationService],
})
export class FeedCelebrationModule {}
