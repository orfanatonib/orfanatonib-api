import { Module, Global } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { AwsModule } from '../../infrastructure/aws/aws.module';
import { TwilioModule } from '../../infrastructure/twilio/twilio.module';

@Global()
@Module({
    imports: [AwsModule, TwilioModule],
    providers: [NotificationService],
    exports: [NotificationService],
})
export class NotificationModule { }
