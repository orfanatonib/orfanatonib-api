import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { RouteModule } from './infrastructure/route/route.module';
import { UserModule } from './core/user/user.module';
import { AuthModule } from './core/auth/auth.module';
import { AwsModule } from './infrastructure/aws/aws.module';
import { TwilioModule } from './infrastructure/twilio/twilio.module';
import { DatabaseModule } from '../database/database.module';
import { MeditationModule } from './content/meditation/meditation.module';
import { ImageModule } from './content/page/image-page/image-page.module';
import { VideosPageModule } from './content/page/video-page/video-page.module';
import { VisitMaterialsPageModule } from './content/page/visit-material-page/visit-material-page.module';
import { ContactModule } from './communication/contact/contact.module';
import { NotificationModule } from './communication/notification/notification.module';
import { EventModule } from './content/event/event.module';
import { CommentModule } from './communication/comment/comment.module';
import { DocumentModule } from './content/document/documents.module';
import { IdeasPageModule } from './content/page/ideas-page/ideas-page.module';
import { InformativeModule } from './content/informative/informative.module';
import { ImageSectionModule } from './content/page/image-section/image-section.module';
import { IdeasSectionModule } from './content/page/ideas-section/ideas-section.module';
import { SiteFeedbackModule } from './communication/feedback/site-feedback.module';
import { AddressesModule } from './shelter/address/addresses.module';
import { LeaderProfilesModule } from './shelter/leader-profile/leader-profiles.module';
import { MemberProfilesModule } from './shelter/member-profile/member-profiles.module';
import { SheltersModule } from './shelter/shelter/shelters.module';
import { ShelteredModule } from './shelter/sheltered/sheltered.module';
import { PagelasModule } from './shelter/pagela/pagelas.module';
import { AcceptedChristsModule } from './shelter/accepted-christ/accepted-christs.module';
import { TeamsModule } from './shelter/team/teams.module';
import { ShelterScheduleModule } from './shelter/schedule/shelter-schedule.module';
import { AttendanceModule } from './attendance/attendance.module';
import { ProfileModule } from './core/profile/profile.module';
import { FeatureFlagsModule } from './core/feature-flags/feature-flags.module';
import { IntegrationModule } from './shelter/integration/integration.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import * as path from 'path';

function getEnvFilePath(): string {
  const env = process.env.ENVIRONMENT || process.env.NODE_ENV || 'local';
  const envFileMap: Record<string, string> = {
    local: 'env/local.env',
    staging: 'env/staging.env',
    production: 'env/prod.env',
    prod: 'env/prod.env',
  };
  return path.resolve(process.cwd(), envFileMap[env] || envFileMap.local);
}

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: getEnvFilePath(),
    }),
    DatabaseModule,
    AwsModule,
    TwilioModule,
    NotificationModule,
    ImageModule,
    RouteModule,
    UserModule,
    AuthModule,
    VideosPageModule,
    VisitMaterialsPageModule,
    MeditationModule,
    ContactModule,
    EventModule,
    CommentModule,
    DocumentModule,
    IdeasPageModule,
    InformativeModule,
    ImageSectionModule,
    IdeasSectionModule,
    SiteFeedbackModule,
    AddressesModule,
    LeaderProfilesModule,
    MemberProfilesModule,
    SheltersModule,
    ShelteredModule,
    PagelasModule,
    AcceptedChristsModule,
    TeamsModule,
    ShelterScheduleModule,
    AttendanceModule,
    ProfileModule,
    FeatureFlagsModule,
    IntegrationModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
