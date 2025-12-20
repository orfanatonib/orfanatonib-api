import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { SheltersController } from './shelters.controller';
import { DeleteSheltersService } from './services/delete-shelters.service';
import { UpdateSheltersService } from './services/update-shelters.service';
import { GetSheltersService } from './services/get-shelters.service';
import { CreateSheltersService } from './services/create-shelters.service';

import { SheltersRepository } from './repositories/shelters.repository';
import { ShelterEntity } from './entities/shelter.entity/shelter.entity';

import { TeacherProfilesModule } from '../teacher-profiles/teacher-profiles.module';
import { AddressesModule } from '../addresses/addresses.module';
import { LeaderProfilesModule } from '../leader-profiles/leader-profiles.module';
import { AddressEntity } from '../addresses/entities/address.entity/address.entity';
import { ShelteredModule } from '../sheltered/sheltered.module';
import { AuthModule } from 'src/auth/auth.module';
import { MediaModule } from 'src/share/media/media.module';
import { AwsModule } from 'src/aws/aws.module';
import { RouteModule } from 'src/route/route.module';
import { RouteEntity } from 'src/route/route-page.entity';
import { TeamsModule } from '../teams/teams.module';
import { TeamEntity } from '../teams/entities/team.entity';
import { MediaItemEntity } from 'src/share/media/media-item/media-item.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([ShelterEntity, AddressEntity, RouteEntity, TeamEntity, MediaItemEntity]),
    forwardRef(() => AddressesModule),
    forwardRef(() => TeacherProfilesModule),
    forwardRef(() => LeaderProfilesModule),
    forwardRef(() => ShelteredModule),
    forwardRef(() => AuthModule),
    forwardRef(() => TeamsModule),
    MediaModule,
    AwsModule,
    RouteModule,
  ],
  controllers: [SheltersController],
  providers: [
    DeleteSheltersService,
    UpdateSheltersService,
    GetSheltersService,
    CreateSheltersService,
    SheltersRepository,
  ],
  exports: [
    DeleteSheltersService,
    UpdateSheltersService,
    GetSheltersService,
    CreateSheltersService,
    SheltersRepository,
    TypeOrmModule,
  ],
})
export class SheltersModule { }
