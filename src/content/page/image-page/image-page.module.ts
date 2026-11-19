import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { DataSource } from "typeorm";
import { RouteModule } from "src/infrastructure/route/route.module";
import { ImagePageEntity } from "./entities/image-page.entity";
import { ImageSectionEntity } from "./entities/image-section.entity";
import { ImageController } from "./image-page.controller";
import { ImagePageRepository } from "./repositories/image-page.repository";
import { ImageSectionRepository } from "../image-section/repositories/image-section.repository";
import { MediaModule } from "src/shared/media/media.module";
import { CreateImagePageService } from "./services/create-image-page.service";
import { GetImagePageService } from "./services/get-image-page.service";
import { DeleteImagePageService } from "./services/delete-image-page.service";
import { UpdateImagePageService } from "./services/update-image-page.service";
import { AuthModule } from "src/core/auth/auth.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([ImagePageEntity, ImageSectionEntity]),
    RouteModule,
    MediaModule,
    AuthModule,
  ],
  controllers: [ImageController],
  providers: [
    CreateImagePageService,
    GetImagePageService,
    DeleteImagePageService,
    UpdateImagePageService,
    {
      provide: ImagePageRepository,
      useFactory: (dataSource: DataSource) =>
        new ImagePageRepository(dataSource),
      inject: [DataSource],
    },
    {
      provide: ImageSectionRepository,
      useFactory: (dataSource: DataSource) =>
        new ImageSectionRepository(dataSource),
      inject: [DataSource],
    },
  ],
  exports: [
    CreateImagePageService,
    GetImagePageService,
    DeleteImagePageService,
    UpdateImagePageService,
  ],
})
export class ImageModule {}
