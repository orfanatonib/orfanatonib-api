import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AwsS3Service } from './aws-s3.service';
import { AwsSESService } from './aws-ses.service';

@Global()
@Module({
    imports: [ConfigModule],
    providers: [AwsS3Service, AwsSESService],
    exports: [AwsS3Service, AwsSESService],
})
export class AwsModule { }
