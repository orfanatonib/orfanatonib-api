import { forwardRef, Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { MeditationController } from "./meditation.controller";
import { MeditationRepository } from "./meditation.repository";
import { MeditationEntity } from "./entities/meditation.entity";
import { DayEntity } from "./entities/day.entity";
import { RouteModule } from "src/infrastructure/route/route.module";
import { MediaModule } from "src/shared/media/media.module";
import { CreateMeditationService } from "./services/create-meditation.service";
import { UpdateMeditationService } from "./services/update-meditation.service";
import { DeleteMeditationService } from "./services/delete-meditation.service";
import { GetMeditationService } from "./services/get-meditation.service";

@Module({
  imports: [
    TypeOrmModule.forFeature([MeditationEntity, DayEntity]),
    forwardRef(() => RouteModule),
    MediaModule,
  ],
  controllers: [MeditationController],
  providers: [
    MeditationRepository,
    CreateMeditationService,
    UpdateMeditationService,
    DeleteMeditationService,
    GetMeditationService,
  ],
  exports: [MeditationRepository, GetMeditationService],
})
export class MeditationModule {}
