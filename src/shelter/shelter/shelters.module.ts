import { Module, forwardRef } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { FeatureFlagsCoreModule } from "src/core/feature-flags/feature-flags-core.module";

import { SheltersController } from "./shelters.controller";
import { DeleteSheltersService } from "./services/delete-shelters.service";
import { UpdateSheltersService } from "./services/update-shelters.service";
import { GetSheltersService } from "./services/get-shelters.service";
import { CreateSheltersService } from "./services/create-shelters.service";

import { SheltersRepository } from "./repositories/shelters.repository";
import { ShelterMediaService } from "./services/shelter-media.service";
import { ShelterRouteService } from "./services/shelter-route.service";
import { ShelterTeamsService } from "./services/shelter-teams.service";
import { ShelterEntity } from "./entities/shelter.entity/shelter.entity";

import { MemberProfilesModule } from "../member-profile/member-profiles.module";
import { AddressesModule } from "../address/addresses.module";
import { LeaderProfilesModule } from "../leader-profile/leader-profiles.module";
import { AddressEntity } from "../address/entities/address.entity/address.entity";
import { ShelteredModule } from "../sheltered/sheltered.module";
import { AuthModule } from "src/core/auth/auth.module";
import { MediaModule } from "src/shared/media/media.module";
import { AwsModule } from "src/infrastructure/aws/aws.module";
import { RouteModule } from "src/infrastructure/route/route.module";
import { RouteEntity } from "src/infrastructure/route/route-page.entity";
import { TeamsModule } from "../team/teams.module";
import { TeamEntity } from "../team/entities/team.entity";
import { MediaItemEntity } from "src/shared/media/media-item/media-item.entity";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ShelterEntity,
      AddressEntity,
      RouteEntity,
      TeamEntity,
      MediaItemEntity,
    ]),
    forwardRef(() => AddressesModule),
    forwardRef(() => MemberProfilesModule),
    forwardRef(() => LeaderProfilesModule),
    forwardRef(() => ShelteredModule),
    forwardRef(() => AuthModule),
    forwardRef(() => TeamsModule),
    FeatureFlagsCoreModule,
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
    ShelterMediaService,
    ShelterRouteService,
    ShelterTeamsService,
  ],
  // O repositório não é exportado: outros módulos falam com os serviços.
  exports: [
    DeleteSheltersService,
    UpdateSheltersService,
    GetSheltersService,
    CreateSheltersService,
    TypeOrmModule,
  ],
})
export class SheltersModule {}
