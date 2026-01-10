import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { LeaderProfileEntity } from './entities/leader-profile.entity/leader-profile.entity';
import { LeaderProfilesRepository } from './repositories/leader-profiles.repository';
import { LeaderProfilesService } from './services/leader-profiles.service';
import { LeaderProfilesController } from './leader-profiles.controller';

import { TeacherProfilesModule } from '../teacher-profile/teacher-profiles.module';
import { SheltersModule } from '../shelter/shelters.module';
import { UserModule } from 'src/core/user/user.module';
import { AuthModule } from 'src/core/auth/auth.module';
import { TeamsModule } from '../team/teams.module';
import { MediaModule } from 'src/shared/media/media.module';
import { ShelterEntity } from '../shelter/entities/shelter.entity/shelter.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([LeaderProfileEntity, ShelterEntity]),
    forwardRef(() => TeacherProfilesModule),
    forwardRef(() => SheltersModule),
    forwardRef(() => UserModule),
    forwardRef(() => AuthModule),
    forwardRef(() => TeamsModule),
    MediaModule,
  ],
  controllers: [LeaderProfilesController],
  providers: [LeaderProfilesRepository, LeaderProfilesService],
  exports: [LeaderProfilesRepository, LeaderProfilesService, TypeOrmModule],
})
export class LeaderProfilesModule {}
