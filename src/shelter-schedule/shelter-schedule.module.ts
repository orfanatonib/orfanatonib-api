import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ShelterScheduleEntity } from './entities/shelter-schedule.entity';
import { ShelterScheduleRepository } from './shelter-schedule.repository';
import { ShelterScheduleController } from './shelter-schedule.controller';
import { CreateShelterScheduleService } from './services/create-shelter-schedule.service';
import { ListShelterSchedulesService } from './services/list-shelter-schedules.service';
import { UpdateShelterScheduleService } from './services/update-shelter-schedule.service';
import { DeleteShelterScheduleService } from './services/delete-shelter-schedule.service';
import { EventModule } from 'src/event/event.module';
import { AuthModule } from 'src/auth/auth.module';
import { TeamEntity } from 'src/modules/teams/entities/team.entity';
import { TeamsModule } from 'src/modules/teams/teams.module';
import { MediaModule } from 'src/share/media/media.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ShelterScheduleEntity, TeamEntity]),
    EventModule,
    AuthModule,
    TeamsModule,
    MediaModule,
  ],
  providers: [
    ShelterScheduleRepository,
    CreateShelterScheduleService,
    ListShelterSchedulesService,
    UpdateShelterScheduleService,
    DeleteShelterScheduleService,
  ],
  controllers: [ShelterScheduleController],
  exports: [ShelterScheduleRepository],
})
export class ShelterScheduleModule {}
