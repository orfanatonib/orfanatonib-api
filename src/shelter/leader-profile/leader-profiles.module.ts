import { Module, forwardRef } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { LeaderProfileEntity } from "./entities/leader-profile.entity/leader-profile.entity";
import { LeaderProfilesRepository } from "./repositories/leader-profiles.repository";
import { LeaderProfilesService } from "./services/leader-profiles.service";
import { GetLeaderProfilesService } from "./services/get-leader-profiles.service";
import { CreateLeaderProfileService } from "./services/create-leader-profile.service";
import { UpdateLeaderProfileService } from "./services/update-leader-profile.service";
import { DeleteLeaderProfileService } from "./services/delete-leader-profile.service";
import { LeaderProfilesController } from "./leader-profiles.controller";

import { MemberProfilesModule } from "../member-profile/member-profiles.module";
import { SheltersModule } from "../shelter/shelters.module";
import { UserModule } from "src/core/user/user.module";
import { AuthModule } from "src/core/auth/auth.module";
import { TeamsModule } from "../team/teams.module";
import { MediaModule } from "src/shared/media/media.module";
import { ShelterEntity } from "../shelter/entities/shelter.entity/shelter.entity";

@Module({
  imports: [
    TypeOrmModule.forFeature([LeaderProfileEntity, ShelterEntity]),
    forwardRef(() => MemberProfilesModule),
    forwardRef(() => SheltersModule),
    forwardRef(() => UserModule),
    forwardRef(() => AuthModule),
    forwardRef(() => TeamsModule),
    MediaModule,
  ],
  controllers: [LeaderProfilesController],
  providers: [
    LeaderProfilesRepository,
    LeaderProfilesService,
    GetLeaderProfilesService,
    CreateLeaderProfileService,
    UpdateLeaderProfileService,
    DeleteLeaderProfileService,
  ],
  exports: [
    LeaderProfilesRepository,
    LeaderProfilesService,
    GetLeaderProfilesService,
    CreateLeaderProfileService,
    UpdateLeaderProfileService,
    DeleteLeaderProfileService,
    TypeOrmModule,
  ],
})
export class LeaderProfilesModule {}
