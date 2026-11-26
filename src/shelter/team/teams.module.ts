import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { TeamsController } from "./teams.controller";
import { GetTeamsService } from "./services/get-teams.service";
import { CreateTeamService } from "./services/create-team.service";
import { UpdateTeamService } from "./services/update-team.service";
import { DeleteTeamService } from "./services/delete-team.service";
import { TeamsRepository } from "./repositories/teams.repository";
import { TeamEntity } from "./entities/team.entity";
import { LeaderProfileEntity } from "src/shelter/leader-profile/entities/leader-profile.entity/leader-profile.entity";
import { MemberProfileEntity } from "src/shelter/member-profile/entities/member-profile.entity/member-profile.entity";
import { ShelterEntity } from "src/shelter/shelter/entities/shelter.entity/shelter.entity";
import { AuthModule } from "src/core/auth/auth.module";

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
  providers: [
    TeamsRepository,
    GetTeamsService,
    CreateTeamService,
    UpdateTeamService,
    DeleteTeamService,
  ],
  exports: [
    TeamsRepository,
    GetTeamsService,
    CreateTeamService,
    UpdateTeamService,
    DeleteTeamService,
  ],
})
export class TeamsModule {}
