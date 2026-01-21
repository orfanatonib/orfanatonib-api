import { Module } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { AwsModule } from 'src/infrastructure/aws/aws.module';
import { TwilioModule } from 'src/infrastructure/twilio/twilio.module';

@Module({
    imports: [AwsModule, TwilioModule],
    providers: [NotificationService],
    exports: [NotificationService],
})
export class NotificationModule { }
