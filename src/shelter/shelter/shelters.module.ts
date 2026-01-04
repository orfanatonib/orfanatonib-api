import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { SheltersController } from './shelters.controller';
import { DeleteSheltersService } from './services/delete-shelters.service';
import { UpdateSheltersService } from './services/update-shelters.service';
import { GetSheltersService } from './services/get-shelters.service';
import { CreateSheltersService } from './services/create-shelters.service';

import { SheltersRepository } from './repositories/shelters.repository';
import { ShelterEntity } from './entities/shelter.entity/shelter.entity';

import { TeacherProfilesModule } from '../teacher-profile/teacher-profiles.module';
import { AddressesModule } from '../address/addresses.module';
import { LeaderProfilesModule } from '../leader-profile/leader-profiles.module';
import { AddressEntity } from '../address/entities/address.entity/address.entity';
import { ShelteredModule } from '../sheltered/sheltered.module';
import { AuthModule } from 'src/core/auth/auth.module';
import { MediaModule } from 'src/shared/media/media.module';
import { AwsModule } from 'src/infrastructure/aws/aws.module';
import { RouteModule } from 'src/infrastructure/route/route.module';
import { RouteEntity } from 'src/infrastructure/route/route-page.entity';
import { TeamsModule } from '../team/teams.module';
import { TeamEntity } from '../team/entities/team.entity';
import { MediaItemEntity } from 'src/shared/media/media-item/media-item.entity';

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
