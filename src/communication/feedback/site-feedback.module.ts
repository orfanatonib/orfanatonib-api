import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { UserModule } from "src/core/user/user.module";
import { NotificationModule } from "../notification/notification.module";
import { CreateSiteFeedbackService } from "./services/create-site-feedback.service";
import { GetSiteFeedbackService } from "./services/get-site-feedback.service";
import { UpdateSiteFeedbackService } from "./services/update-site-feedback.service";
import { DeleteSiteFeedbackService } from "./services/delete-site-feedback.service";
import { SiteFeedbackController } from "./site-feedback.controller";
import { SiteFeedbackEntity } from "./entity/site-feedback.entity";
import { SiteFeedbackRepository } from "./repository/site-feedback.repository";

@Module({
  imports: [
    TypeOrmModule.forFeature([SiteFeedbackEntity]),
    UserModule,
    NotificationModule,
  ],
  controllers: [SiteFeedbackController],
  providers: [
    SiteFeedbackRepository,
    CreateSiteFeedbackService,
    GetSiteFeedbackService,
    UpdateSiteFeedbackService,
    DeleteSiteFeedbackService,
  ],
  exports: [
    CreateSiteFeedbackService,
    GetSiteFeedbackService,
    UpdateSiteFeedbackService,
    DeleteSiteFeedbackService,
  ],
})
export class SiteFeedbackModule {}
