import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AwsModule } from "src/infrastructure/aws/aws.module";
import { RouteModule } from "src/infrastructure/route/route.module";
import { MediaModule } from "src/shared/media/media.module";

import { VisitMaterialsPageController } from "./visit-material-page.controller";
import { VisitMaterialsPageEntity } from "./entities/visit-material-page.entity";
import { VisitMaterialsPageRepository } from "./repositories/visit-material-page.repository";
import { CreateVisitMaterialPageService } from "./services/create-visit-material-page.service";
import { GetVisitMaterialPageService } from "./services/get-visit-material-page.service";
import { UpdateVisitMaterialPageService } from "./services/update-visit-material-page.service";
import { DeleteVisitMaterialPageService } from "./services/delete-visit-material-page.service";
import { SetCurrentVisitMaterialPageService } from "./services/set-current-visit-material-page.service";
import { VisitMaterialMediaService } from "./services/visit-material-media.service";

@Module({
  imports: [
    TypeOrmModule.forFeature([VisitMaterialsPageEntity]),
    RouteModule,
    MediaModule,
    AwsModule,
  ],
  controllers: [VisitMaterialsPageController],
  providers: [
    VisitMaterialsPageRepository,
    VisitMaterialMediaService,
    CreateVisitMaterialPageService,
    GetVisitMaterialPageService,
    UpdateVisitMaterialPageService,
    DeleteVisitMaterialPageService,
    SetCurrentVisitMaterialPageService,
  ],
  exports: [TypeOrmModule],
})
export class VisitMaterialsPageModule {}
