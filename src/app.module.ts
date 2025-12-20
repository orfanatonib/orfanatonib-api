import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { RouteModule } from './route/route.module';
import { UserModule } from './user/user.module';
import { AuthModule } from './auth/auth.module';
import { AwsModule } from './aws/aws.module';
import { DatabaseModule } from '../database/database.module';
import { MeditationModule } from './meditation/meditation.module';
import { ImageModule } from './pages/image-page/image-page.module';
import { VideosPageModule } from './pages/video-page/video-page.module';
import { VisitMaterialsPageModule } from './pages/visit-material-page/visit-material-page.module';
import { ContactModule } from './contact/contact.module';
import { EventModule } from './pages/event-page/event.module';
import { CommentModule } from './comment/comment.module';
import { DocumentModule } from './documents/documents.module';
import { IdeasPageModule } from './pages/ideas-page/ideas-page.module';
import { InformativeModule } from './informative/informative.module';
import { ImageSectionModule } from './pages/image-section/image-section.module';
import { IdeasSectionModule } from './pages/ideas-section/ideas-section.module';
import { SiteFeedbackModule } from './feedback/site-feedback.module';
import { AddressesModule } from './modules/addresses/addresses.module';
import { LeaderProfilesModule } from './modules/leader-profiles/leader-profiles.module';
import { TeacherProfilesModule } from './modules/teacher-profiles/teacher-profiles.module';
import { SheltersModule } from './modules/shelters/shelters.module';
import { ShelteredModule } from './modules/sheltered/sheltered.module';
import { PagelasModule } from './modules/pagelas/pagelas.module';
import { AcceptedChristsModule } from './modules/accepted-christs/accepted-christs.module';
import { TeamsModule } from './modules/teams/teams.module';
import * as path from 'path';

// Determina qual arquivo de ambiente usar
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
           TeacherProfilesModule,
           SheltersModule,
           ShelteredModule,
    PagelasModule,
    AcceptedChristsModule,
    TeamsModule
  ],
})
export class AppModule { }
