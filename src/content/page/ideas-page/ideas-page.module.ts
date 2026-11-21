import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { DataSource } from "typeorm";
import { IdeasPageController } from "./ideas-page.controller";
import { IdeasPageEntity } from "./entities/ideas-page.entity";
import { IdeasSectionEntity } from "../ideas-section/entities/ideas-section.entity";
import { IdeasPageRepository } from "./repositories/ideas-page.repository";
import { CreateIdeasPageService } from "./services/create-ideas-page.service";
import { JwtModule } from "@nestjs/jwt";
import { AuthContextService } from "src/core/auth/services/auth-context.service";
import { RouteModule } from "src/infrastructure/route/route.module";
import { AwsModule } from "src/infrastructure/aws/aws.module";
import { MediaModule } from "src/shared/media/media.module";
import { DeleteIdeasPageService } from "./services/delete-ideas-page.service";
import { GetIdeasPageService } from "./services/get-ideas-page.service";
import { UpdateIdeasPageService } from "./services/update-ideas-page.service";
import { IdeasPageMediaSyncService } from "./services/ideas-page-media-sync.service";
import { IdeasPageWriteRepository } from "./repositories/ideas-page-write.repository";

@Module({
  imports: [
    TypeOrmModule.forFeature([IdeasPageEntity, IdeasSectionEntity]),
    RouteModule,
    AwsModule,
    MediaModule,
    // Só valida o token (secret explícito); evita importar o AuthModule (ciclo de módulos).
    JwtModule.register({}),
  ],
  controllers: [IdeasPageController],
  providers: [
    AuthContextService,
    CreateIdeasPageService,
    DeleteIdeasPageService,
    GetIdeasPageService,
    UpdateIdeasPageService,
    IdeasPageMediaSyncService,
    IdeasPageWriteRepository,
    {
      provide: IdeasPageRepository,
      useFactory: (dataSource: DataSource) =>
        new IdeasPageRepository(dataSource),
      inject: [DataSource],
    },
  ],
})
export class IdeasPageModule {}
