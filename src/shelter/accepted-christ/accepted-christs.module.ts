import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AcceptedChristEntity } from "./entities/accepted-christ.entity";
import { ShelteredEntity } from "../sheltered/entities/sheltered.entity";
import { AcceptedChristRepository } from "./repositories/accepted-christ.repository";
import { CreateAcceptedChristService } from "./services/create-accepted-christ.service";
import { AcceptedChristController } from "./controllers/accepted-christ.controller";
import { PagelasModule } from "../pagela/pagelas.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([AcceptedChristEntity, ShelteredEntity]),
    PagelasModule,
  ],
  controllers: [AcceptedChristController],
  providers: [CreateAcceptedChristService, AcceptedChristRepository],
  exports: [CreateAcceptedChristService, AcceptedChristRepository],
})
export class AcceptedChristsModule {}
