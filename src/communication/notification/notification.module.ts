import { Global, Module, forwardRef } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { EmailModule } from "src/infrastructure/email/email.module";
import { FeatureFlagsCoreModule } from 'src/core/feature-flags/feature-flags-core.module';
import { AuthModule } from "src/core/auth/auth.module";

import { EmailOutboxEntity } from "./outbox/email-outbox.entity";
import { EmailOutboxRepository } from "./outbox/email-outbox.repository";
import { EmailOutboxService } from "./outbox/email-outbox.service";
import { EmailOutboxWorker } from "./outbox/email-outbox.worker";
import { EmailDispatchService } from "./services/email-dispatch.service";
import { NotificationService } from "./services/notification.service";
import { EmailPreviewController } from "./preview/email-preview.controller";

@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([EmailOutboxEntity]),
    EmailModule,
    FeatureFlagsCoreModule,
    // Só pelos guards do preview; o auth não depende deste módulo de volta
    // na inicialização, mas o forwardRef mantém a ordem segura.
    forwardRef(() => AuthModule),
  ],
  controllers: [EmailPreviewController],
  providers: [
    EmailOutboxRepository,
    EmailOutboxService,
    EmailOutboxWorker,
    EmailDispatchService,
    NotificationService,
  ],
  exports: [NotificationService, EmailDispatchService, EmailOutboxService],
})
export class NotificationModule {}
