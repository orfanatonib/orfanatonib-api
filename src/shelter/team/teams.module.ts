import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TeamsController } from './teams.controller';
import { TeamsService } from './services/teams.service';
import { TeamsRepository } from './repositories/teams.repository';
import { TeamEntity } from './entities/team.entity';
import { LeaderProfileEntity } from 'src/shelter/leader-profile/entities/leader-profile.entity/leader-profile.entity';
import { MemberProfileEntity } from 'src/shelter/member-profile/entities/member-profile.entity/member-profile.entity';
import { ShelterEntity } from 'src/shelter/shelter/entities/shelter.entity/shelter.entity';
import { AuthModule } from 'src/core/auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      TeamEntity,
      LeaderProfileEntity,
      MemberProfileEntity,
      ShelterEntity,
    ]),
    AuthModule,
  ],
  controllers: [TeamsController],
  providers: [TeamsService, TeamsRepository],
  exports: [TeamsService, TeamsRepository],
})
export class TeamsModule {}

