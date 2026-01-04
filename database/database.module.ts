import { Module, Logger } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { DatabaseLoggerService } from './database-logger.service';
import { MeditationEntity } from 'src/content/meditation/entities/meditation.entity';
import { DayEntity } from 'src/content/meditation/entities/day.entity';
import { ImagePageEntity } from 'src/content/page/image-page/entity/Image-page.entity';
import { ImageSectionEntity } from 'src/content/page/image-page/entity/Image-section.entity';
import { RouteEntity } from 'src/infrastructure/route/route-page.entity';
import { UserEntity } from 'src/core/user/entities/user.entity';
import { VideosPage } from 'src/content/page/video-page/entities/video-page.entity';

import { VisitMaterialsPageEntity } from 'src/content/page/visit-material-page/entities/visit-material-page.entity';
import { MediaItemEntity } from 'src/shared/media/media-item/media-item.entity';
import { ContactEntity } from 'src/communication/contact/contact.entity';
import { EventEntity } from 'src/content/event/entities/event.entity';
import { CommentEntity } from 'src/communication/comment/entity/comment.entity';
import { DocumentEntity } from 'src/content/document/entities/document.entity';
import { IdeasSectionEntity } from 'src/content/page/ideas-section/entites/ideas-section.entity';
import { IdeasPageEntity } from 'src/content/page/ideas-page/entities/ideas-page.entity';
import { InformativeEntity } from 'src/content/informative/entities/informative.entity';
import { SiteFeedbackEntity } from 'src/communication/feedback/entity/site-feedback.entity';
import { ShelterEntity } from 'src/shelter/shelter/entities/shelter.entity/shelter.entity';
import { TeacherProfileEntity } from 'src/shelter/teacher-profile/entities/teacher-profile.entity/teacher-profile.entity';
import { LeaderProfileEntity } from 'src/shelter/leader-profile/entities/leader-profile.entity/leader-profile.entity';
import { AddressEntity } from 'src/shelter/address/entities/address.entity/address.entity';
import { ShelteredEntity } from 'src/shelter/sheltered/entities/sheltered.entity';
import { PagelaEntity } from 'src/shelter/pagela/entities/pagela.entity';
import { AcceptedChristEntity } from 'src/shelter/accepted-christ/entities/accepted-christ.entity';
import { TeamEntity } from 'src/shelter/team/entities/team.entity';
import { ShelterScheduleEntity } from 'src/shelter/schedule/entities/shelter-schedule.entity';
import { PersonalData } from 'src/core/profile/entities/personal-data.entity';
import { UserPreferences } from 'src/core/profile/entities/user-preferences.entity';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const logger = new Logger('DatabaseModule');
        const synchronize = true;
        
        const dbConfig = {
          type: 'mysql' as const,
          host: configService.get<string>('DB_HOST', 'localhost'),
          port: configService.get<number>('DB_PORT', 3306),
          username: configService.get<string>('DB_USERNAME', 'root'),
          password: configService.get<string>('DB_PASSWORD', ''),
          database: configService.get<string>('DB_NAME', 'test'),
          entities: [
            EventEntity,
            ImagePageEntity,
            ImageSectionEntity,
            RouteEntity,
            UserEntity,
            VideosPage,
            VisitMaterialsPageEntity,
            MeditationEntity,
            DayEntity,
            MediaItemEntity,
            ContactEntity,
            CommentEntity,
            DocumentEntity,
            IdeasPageEntity,
            IdeasSectionEntity,
            InformativeEntity,
            SiteFeedbackEntity,
            ShelterEntity,
            TeacherProfileEntity,
            LeaderProfileEntity,
            AddressEntity,
            ShelteredEntity,
            PagelaEntity,
            AcceptedChristEntity,
            TeamEntity,
            ShelterScheduleEntity,
            PersonalData,
            UserPreferences
          ],
          synchronize,
        };

        return dbConfig;
      },
    }),
  ],
  providers: [DatabaseLoggerService],
})
export class DatabaseModule { }
