import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { PagelaEntity } from "./entities/pagela.entity";
import { ShelteredEntity } from "src/shelter/sheltered/entities/sheltered.entity";
import { MemberProfileEntity } from "src/shelter/member-profile/entities/member-profile.entity/member-profile.entity";
import { PagelasRepository } from "./pagelas.repository";
import { GetPagelasService } from "./services/get-pagelas.service";
import { CreatePagelaService } from "./services/create-pagela.service";
import { UpdatePagelaService } from "./services/update-pagela.service";
import { DeletePagelaService } from "./services/delete-pagela.service";
import { PagelasController } from "./pagelas.controller";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PagelaEntity,
      ShelteredEntity,
      MemberProfileEntity,
    ]),
  ],
  controllers: [PagelasController],
  providers: [
    PagelasRepository,
    GetPagelasService,
    CreatePagelaService,
    UpdatePagelaService,
    DeletePagelaService,
  ],
  exports: [
    PagelasRepository,
    GetPagelasService,
    CreatePagelaService,
    UpdatePagelaService,
    DeletePagelaService,
  ],
})
export class PagelasModule {}
