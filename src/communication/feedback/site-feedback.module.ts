import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { UserModule } from "src/core/user/user.module";
import { SiteFeedbackService } from "./site-feedback.service";
import { SiteFeedbackController } from "./site-feedback.controller";
import { SiteFeedbackEntity } from "./entity/site-feedback.entity";
import { SiteFeedbackRepository } from "./repository/site-feedback.repository";

@Module({
  imports: [TypeOrmModule.forFeature([SiteFeedbackEntity]), UserModule],
  controllers: [SiteFeedbackController],
  providers: [SiteFeedbackService, SiteFeedbackRepository],
})
export class SiteFeedbackModule {}
