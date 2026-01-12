import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { MemberProfilesRepository } from './repositories/member-profiles.repository';
import { MemberProfilesService } from './services/member-profiles.service';
import { MemberProfilesController } from './member-profiles.controller';

import { MemberProfileEntity } from './entities/member-profile.entity/member-profile.entity';
import { LeaderProfilesModule } from '../leader-profile/leader-profiles.module';
import { SheltersModule } from '../shelter/shelters.module';
import { UserModule } from 'src/core/user/user.module';
import { AuthModule } from 'src/core/auth/auth.module';
import { TeamsModule } from '../team/teams.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([MemberProfileEntity]),
    forwardRef(() => LeaderProfilesModule),
    forwardRef(() => SheltersModule),
    forwardRef(() => UserModule),
    forwardRef(() => AuthModule),
    forwardRef(() => TeamsModule),
  ],
  controllers: [MemberProfilesController],
  providers: [MemberProfilesRepository, MemberProfilesService],
  exports: [MemberProfilesRepository, MemberProfilesService, TypeOrmModule],
})
export class MemberProfilesModule { }
