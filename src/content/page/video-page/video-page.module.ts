import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { DataSource } from "typeorm";

import { VideosPage } from "./entities/video-page.entity";
import { VideosPageController } from "./video-page.controller";
import { VideosPageRepository } from "./repositories/video-page.repository";
import { RouteModule } from "src/infrastructure/route/route.module";
import { MediaModule } from "src/shared/media/media.module";
import { CreateVideosPageService } from "./services/create-video-page.service";
import { DeleteVideosPageService } from "./services/delete-video-page.service";
import { GetVideosPageService } from "./services/get-video-page.service";
import { UpdateVideosPageService } from "./services/update-video-page.service";

@Module({
  imports: [TypeOrmModule.forFeature([VideosPage]), RouteModule, MediaModule],
  controllers: [VideosPageController],
  providers: [
    CreateVideosPageService,
    DeleteVideosPageService,
    GetVideosPageService,
    UpdateVideosPageService,
    {
      provide: VideosPageRepository,
      useFactory: (dataSource: DataSource) =>
        new VideosPageRepository(dataSource),
      inject: [DataSource],
    },
  ],
})
export class VideosPageModule {}
