import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AwsModule } from "src/infrastructure/aws/aws.module";
import { RouteModule } from "src/infrastructure/route/route.module";
import { MediaModule } from "src/shared/media/media.module";

import { VisitMaterialsPageController } from "./visit-material-page.controller";
import { VisitMaterialsPageEntity } from "./entities/visit-material-page.entity";
import { VisitMaterialSectionEntity } from "./entities/visit-material-section.entity";
import { VisitMaterialSectionRepository } from "./repositories/visit-material-section.repository";
import { VisitMaterialSectionsService } from "./services/visit-material-sections.service";
import { VisitMaterialsPageRepository } from "./repositories/visit-material-page.repository";
import { CreateVisitMaterialPageService } from "./services/create-visit-material-page.service";
import { AppendVisitMaterialSectionsService } from "./services/append-visit-material-sections.service";
import { GetVisitMaterialPageService } from "./services/get-visit-material-page.service";
import { UpdateVisitMaterialPageService } from "./services/update-visit-material-page.service";
import { DeleteVisitMaterialPageService } from "./services/delete-visit-material-page.service";
import { SetCurrentVisitMaterialPageService } from "./services/set-current-visit-material-page.service";
import { SetVisitMaterialPageCoverService } from "./services/set-visit-material-page-cover.service";
import { VisitMaterialMediaService } from "./services/visit-material-media.service";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      VisitMaterialsPageEntity,
      VisitMaterialSectionEntity,
    ]),
    RouteModule,
    MediaModule,
    AwsModule,
  ],
  controllers: [VisitMaterialsPageController],
  providers: [
    VisitMaterialsPageRepository,
    VisitMaterialMediaService,
    VisitMaterialSectionRepository,
    VisitMaterialSectionsService,
    CreateVisitMaterialPageService,
    AppendVisitMaterialSectionsService,
    GetVisitMaterialPageService,
    UpdateVisitMaterialPageService,
    DeleteVisitMaterialPageService,
    SetCurrentVisitMaterialPageService,
    SetVisitMaterialPageCoverService,
  ],
  exports: [
    TypeOrmModule,
    CreateVisitMaterialPageService,
    AppendVisitMaterialSectionsService,
    GetVisitMaterialPageService,
    SetVisitMaterialPageCoverService,
  ],
})
export class VisitMaterialsPageModule {}
