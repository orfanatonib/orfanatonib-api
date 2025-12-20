import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { TeacherProfilesRepository } from './repositories/teacher-profiles.repository';
import { TeacherProfilesService } from './services/teacher-profiles.service';
import { TeacherProfilesController } from './teacher-profiles.controller';

import { TeacherProfileEntity } from './entities/teacher-profile.entity/teacher-profile.entity';
import { LeaderProfilesModule } from '../leader-profiles/leader-profiles.module';
import { SheltersModule } from '../shelters/shelters.module';
import { UserModule } from 'src/user/user.module';
import { AuthModule } from 'src/auth/auth.module';
import { TeamsModule } from '../teams/teams.module';

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
