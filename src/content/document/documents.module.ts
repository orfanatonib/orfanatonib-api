import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { DocumentsController } from "./documents.controller";
import { DocumentEntity } from "./entities/document.entity";
import { MediaModule } from "src/shared/media/media.module";

import { CreateDocumentService } from "./services/create-document.service";
import { UpdateDocumentService } from "./services/update-document.service";
import { GetDocumentService } from "./services/get-document.service";
import { DeleteDocumentService } from "./services/delete-document.service";
import { DocumentRepository } from "./document.repository";
import { RouteService } from "src/infrastructure/route/services/route.service";
import { RouteRepository } from "src/infrastructure/route/route-page.repository";
import { MeditationModule } from "src/content/meditation/meditation.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([DocumentEntity]),
    MediaModule,
    MeditationModule,
  ],
  controllers: [DocumentsController],
  providers: [
    DocumentRepository,
    CreateDocumentService,
    UpdateDocumentService,
    GetDocumentService,
    RouteService,
    DeleteDocumentService,
    RouteRepository,
  ],
  exports: [
    DocumentRepository,
    CreateDocumentService,
    UpdateDocumentService,
    GetDocumentService,
    DeleteDocumentService,
  ],
})
export class DocumentModule {}
