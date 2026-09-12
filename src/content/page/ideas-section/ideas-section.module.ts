import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AwsModule } from "src/infrastructure/aws/aws.module";
import { MediaModule } from "src/shared/media/media.module";

import { IdeasPageEntity } from "../ideas-page/entities/ideas-page.entity";
import { IdeasSectionEntity } from "./entities/ideas-section.entity";
import { IdeasSectionController } from "./ideas-section.controller";
import { IdeasSectionRepository } from "./repositories/ideas-section.repository";
import { AttachIdeasSectionService } from "./services/attach-ideas-section.service";
import { CreateIdeasSectionService } from "./services/create-ideas-section.service";
import { DeleteIdeasSectionService } from "./services/delete-ideas-section.service";
import { GetIdeasSectionsService } from "./services/get-ideas-sections.service";
import { IdeasSectionMediaService } from "./services/ideas-section-media.service";
import { UpdateIdeasSectionService } from "./services/update-ideas-section.service";

@Module({
  imports: [
    TypeOrmModule.forFeature([IdeasSectionEntity, IdeasPageEntity]),
    AwsModule,
    MediaModule,
  ],
  controllers: [IdeasSectionController],
  providers: [
    CreateIdeasSectionService,
    UpdateIdeasSectionService,
    AttachIdeasSectionService,
    GetIdeasSectionsService,
    DeleteIdeasSectionService,
    IdeasSectionMediaService,
    IdeasSectionRepository,
  ],
  // Contrato de leitura para quem precisa das seções; o repositório não sai
  // do módulo.
  exports: [GetIdeasSectionsService],
})
export class IdeasSectionModule {}
