import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { ImagePageEntity } from "../image-page/entities/image-page.entity";
import { ImageSectionRepository } from "./repositories/image-section.repository";
import { ImagePageRepository } from "../image-page/repositories/image-page.repository";
import { MediaModule } from "src/shared/media/media.module";
import { ImageSectionEntity } from "../image-page/entities/image-section.entity";
import { AwsModule } from "src/infrastructure/aws/aws.module";
import { UpdateImageSectionService } from "./services/update-image-section.service";
import { DeleteImageSectionService } from "./services/delete-image-section.service";
import { GetImageSectionService } from "./services/get-image-section.service";
import { ImageSectionController } from "./image-section.controller";
import { CreateImageSectionService } from "./services/create-image-section.service";
import { UserModule } from "src/core/user/user.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([ImageSectionEntity, ImagePageEntity]),
    MediaModule,
    AwsModule,
    UserModule,
  ],
  controllers: [ImageSectionController],
  providers: [
    ImageSectionRepository,
    ImagePageRepository,
    CreateImageSectionService,
    DeleteImageSectionService,
    GetImageSectionService,
    UpdateImageSectionService,
  ],
})
export class ImageSectionModule {}
