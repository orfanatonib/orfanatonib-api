import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { DataSource } from "typeorm";

import { VideosPage } from "./entities/video-page.entity";
import { VideosPageController } from "./video-page.controller";
import { VideosPageRepository } from "./repositories/video-page.repository";
import { JwtModule } from "@nestjs/jwt";
import { AuthContextService } from "src/core/auth/services/auth-context.service";
import { RouteModule } from "src/infrastructure/route/route.module";
import { MediaModule } from "src/shared/media/media.module";
import { CreateVideosPageService } from "./services/create-video-page.service";
import { DeleteVideosPageService } from "./services/delete-video-page.service";
import { GetVideosPageService } from "./services/get-video-page.service";
import { UpdateVideosPageService } from "./services/update-video-page.service";
import { VideoPageMediaService } from "./services/video-page-media.service";

@Module({
  imports: [
    TypeOrmModule.forFeature([VideosPage]),
    RouteModule,
    MediaModule,
    // Só valida o token (secret explícito); evita importar o AuthModule (ciclo de módulos).
    JwtModule.register({}),
  ],
  controllers: [VideosPageController],
  providers: [
    CreateVideosPageService,
    DeleteVideosPageService,
    GetVideosPageService,
    UpdateVideosPageService,
    VideoPageMediaService,
    AuthContextService,
    {
      provide: VideosPageRepository,
      useFactory: (dataSource: DataSource) =>
        new VideosPageRepository(dataSource),
      inject: [DataSource],
    },
  ],
})
export class VideosPageModule {}
