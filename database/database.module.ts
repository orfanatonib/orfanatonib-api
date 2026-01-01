import { Module, Logger } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { DatabaseLoggerService } from './database-logger.service';
import { MeditationEntity } from 'src/meditation/entities/meditation.entity';
import { DayEntity } from 'src/meditation/entities/day.entity';
import { ImagePageEntity } from 'src/pages/image-page/entity/Image-page.entity';
import { ImageSectionEntity } from 'src/pages/image-page/entity/Image-section.entity';
import { RouteEntity } from 'src/route/route-page.entity';
import { UserEntity } from 'src/user/user.entity';
import { VideosPage } from 'src/pages/video-page/entities/video-page.entity';

import { VisitMaterialsPageEntity } from 'src/pages/visit-material-page/entities/visit-material-page.entity';
import { MediaItemEntity } from 'src/share/media/media-item/media-item.entity';
import { ContactEntity } from 'src/contact/contact.entity';
import { EventEntity } from 'src/event/entities/event.entity';
import { CommentEntity } from 'src/comment/entity/comment.entity';
import { DocumentEntity } from 'src/documents/entities/document.entity';
import { IdeasSectionEntity } from 'src/pages/ideas-page/entities/ideas-section.entity';
import { IdeasPageEntity } from 'src/pages/ideas-page/entities/ideas-page.entity';
import { InformativeEntity } from 'src/informative/entities/informative.entity';
import { SiteFeedbackEntity } from 'src/feedback/entity/site-feedback.entity';
import { ShelterEntity } from 'src/modules/shelters/entities/shelter.entity/shelter.entity';
import { TeacherProfileEntity } from 'src/modules/teacher-profiles/entities/teacher-profile.entity/teacher-profile.entity';
import { LeaderProfileEntity } from 'src/modules/leader-profiles/entities/leader-profile.entity/leader-profile.entity';
import { AddressEntity } from 'src/modules/addresses/entities/address.entity/address.entity';
import { ShelteredEntity } from 'src/modules/sheltered/entities/sheltered.entity';
import { PagelaEntity } from 'src/modules/pagelas/entities/pagela.entity';
import { AcceptedChristEntity } from 'src/modules/accepted-christs/entities/accepted-christ.entity';
import { TeamEntity } from 'src/modules/teams/entities/team.entity';

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
            TeamEntity
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
