import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { DataSource } from "typeorm";
import { IdeasPageController } from "./ideas-page.controller";
import { IdeasPageEntity } from "./entities/ideas-page.entity";
import { IdeasSectionEntity } from "../ideas-section/entities/ideas-section.entity";
import { IdeasPageRepository } from "./repositories/ideas-page.repository";
import { CreateIdeasPageService } from "./services/create-ideas-page.service";
import { RouteModule } from "src/infrastructure/route/route.module";
import { AwsModule } from "src/infrastructure/aws/aws.module";
import { MediaModule } from "src/shared/media/media.module";
import { DeleteIdeasPageService } from "./services/delete-ideas-page.service";
import { GetIdeasPageService } from "./services/get-ideas-page.service";
import { UpdateIdeasPageService } from "./services/update-ideas-page.service";

@Module({
  imports: [
    TypeOrmModule.forFeature([IdeasPageEntity, IdeasSectionEntity]),
    RouteModule,
    AwsModule,
    MediaModule,
  ],
  controllers: [IdeasPageController],
  providers: [
    CreateIdeasPageService,
    DeleteIdeasPageService,
    GetIdeasPageService,
    UpdateIdeasPageService,
    {
      provide: IdeasPageRepository,
      useFactory: (dataSource: DataSource) =>
        new IdeasPageRepository(dataSource),
      inject: [DataSource],
    },
  ],
})
export class IdeasPageModule {}
