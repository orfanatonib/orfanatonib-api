import { Module, Global } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { EmailModule } from '../../infrastructure/email/email.module';
import { TwilioModule } from '../../infrastructure/twilio/twilio.module';

@Global()
@Module({
  imports: [EmailModule, TwilioModule],
  providers: [NotificationService],
  exports: [NotificationService],
})
export class NotificationModule {}
