import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { IntegrationEntity } from "./entities/integration.entity";
import { IntegrationController } from "./integration.controller";
import { IntegrationRepository } from "./integration.repository";
import { CreateIntegrationService } from "./services/create-integration.service";
import { GetIntegrationService } from "./services/get-integration.service";
import { UpdateIntegrationService } from "./services/update-integration.service";
import { DeleteIntegrationService } from "./services/delete-integration.service";
import { MediaModule } from "src/shared/media/media.module";
import { AwsModule } from "src/infrastructure/aws/aws.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([IntegrationEntity]),
    MediaModule,
    AwsModule,
  ],
  controllers: [IntegrationController],
  providers: [
    IntegrationRepository,
    CreateIntegrationService,
    GetIntegrationService,
    UpdateIntegrationService,
    DeleteIntegrationService,
  ],
  exports: [
    IntegrationRepository,
    CreateIntegrationService,
    GetIntegrationService,
    UpdateIntegrationService,
    DeleteIntegrationService,
  ],
})
export class IntegrationModule {}
