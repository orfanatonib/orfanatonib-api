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
import { AuthModule } from 'src/core/auth/auth.module';

@Module({
  imports: [TypeOrmModule.forFeature([EventEntity]), RouteModule, MediaModule, AuthModule],
  providers: [EventRepository, CreateEventService, UpdateEventService, DeleteEventService, GetEventService],
  controllers: [EventController],
  exports: [EventRepository, DeleteEventService],
})
export class EventModule { }