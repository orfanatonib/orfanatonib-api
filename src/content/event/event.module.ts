import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { GetEventService } from './services/get-event-service';
import { RouteModule } from 'src/infrastructure/route/route.module';
import { MediaModule } from 'src/shared/media/media.module';
import { EventRepository } from './event.repository';
import { EventController } from './event.controller';
import { EventEntity } from './entities/event.entity';
import { CreateEventService } from './services/create-event-service';
import { UpdateEventService } from './services/update-event-service';
import { DeleteEventService } from './services/delete-event-service';
import { EventNotificationHelper } from './services/event-notification.helper';
import { AuthModule } from 'src/core/auth/auth.module';
import { UserModule } from 'src/core/user/user.module';
import { FeatureFlagsModule } from 'src/core/feature-flags/feature-flags.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([EventEntity]),
    RouteModule,
    MediaModule,
    AuthModule,
    UserModule,
    FeatureFlagsModule,
  ],
  providers: [
    EventRepository,
    CreateEventService,
    UpdateEventService,
    DeleteEventService,
    GetEventService,
    EventNotificationHelper,
  ],
  controllers: [EventController],
  exports: [EventRepository, CreateEventService, UpdateEventService, DeleteEventService],
})
export class EventModule {}