import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { TeacherProfilesRepository } from './repositories/teacher-profiles.repository';
import { TeacherProfilesService } from './services/teacher-profiles.service';
import { TeacherProfilesController } from './teacher-profiles.controller';

import { TeacherProfileEntity } from './entities/teacher-profile.entity/teacher-profile.entity';
import { LeaderProfilesModule } from '../leader-profile/leader-profiles.module';
import { SheltersModule } from '../shelter/shelters.module';
import { UserModule } from 'src/core/user/user.module';
import { AuthModule } from 'src/core/auth/auth.module';
import { TeamsModule } from '../team/teams.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([TeacherProfileEntity]),
    forwardRef(() => LeaderProfilesModule),
    forwardRef(() => SheltersModule),
    forwardRef(() => UserModule),
    forwardRef(() => AuthModule),
    forwardRef(() => TeamsModule),
  ],
  controllers: [TeacherProfilesController],
  providers: [TeacherProfilesRepository, TeacherProfilesService],
  exports: [TeacherProfilesRepository, TeacherProfilesService, TypeOrmModule],
})
export class TeacherProfilesModule { }
