import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { AuthModule } from "src/core/auth/auth.module";
import { FeatureFlagsModule } from "src/core/feature-flags/feature-flags.module";
import { UserModule } from "src/core/user/user.module";

import { InboxNotificationController } from "./inbox-notification.controller";
import { InboxNotificationEntity } from "./entities/inbox-notification.entity";
import { InboxNotificationRepository } from "./repositories/inbox-notification.repository";
import { CreateInboxNotificationService } from "./services/create-inbox-notification.service";
import { GetInboxNotificationService } from "./services/get-inbox-notification.service";
import { UpdateInboxNotificationService } from "./services/update-inbox-notification.service";

/** Sininho: caixa de entrada persistida por usuário. Quem produz eventos usa `CreateInboxNotificationService`. */
@Module({
  imports: [
    TypeOrmModule.forFeature([InboxNotificationEntity]),
    AuthModule,
    FeatureFlagsModule,
    UserModule,
  ],
  controllers: [InboxNotificationController],
  providers: [
    InboxNotificationRepository,
    CreateInboxNotificationService,
    GetInboxNotificationService,
    UpdateInboxNotificationService,
  ],
  exports: [CreateInboxNotificationService],
})
export class InboxNotificationModule {}
