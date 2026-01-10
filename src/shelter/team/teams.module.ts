import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TeamsController } from './teams.controller';
import { TeamsService } from './services/teams.service';
import { TeamsRepository } from './repositories/teams.repository';
import { TeamEntity } from './entities/team.entity';
import { LeaderProfileEntity } from 'src/shelter/leader-profile/entities/leader-profile.entity/leader-profile.entity';
import { TeacherProfileEntity } from 'src/shelter/teacher-profile/entities/teacher-profile.entity/teacher-profile.entity';
import { ShelterEntity } from 'src/shelter/shelter/entities/shelter.entity/shelter.entity';
import { AuthModule } from 'src/core/auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      TeamEntity,
      LeaderProfileEntity,
      TeacherProfileEntity,
      ShelterEntity,
    ]),
    AuthModule,
  ],
  controllers: [TeamsController],
  providers: [TeamsService, TeamsRepository],
  exports: [TeamsService, TeamsRepository],
})
export class TeamsModule {}

