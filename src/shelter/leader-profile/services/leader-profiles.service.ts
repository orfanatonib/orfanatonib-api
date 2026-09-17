import { Injectable } from "@nestjs/common";
import { Request } from "express";
import { GetLeaderProfilesService } from "./get-leader-profiles.service";
import { CreateLeaderProfileService } from "./create-leader-profile.service";
import { UpdateLeaderProfileService } from "./update-leader-profile.service";
import { DeleteLeaderProfileService } from "./delete-leader-profile.service";
import { LeaderResponseDto } from "../dto/leader-profile.response.dto";
import { LeaderSimpleListDto } from "../dto/leader-simple-list.dto";
import { LeaderProfileEntity } from "../entities/leader-profile.entity/leader-profile.entity";
import { LeaderProfilesQueryDto, PageDto } from "../dto/leader-profiles.query.dto";
import { ManageLeaderTeamDto, ManageLeaderTeamsDto } from "../dto/assign-team.dto";
import { ShelterWithLeaderStatusDto } from "src/shelter/shelter/dto/shelter.response.dto";

@Injectable()
export class LeaderProfilesService {
  constructor(
    private readonly getService: GetLeaderProfilesService,
    private readonly createService: CreateLeaderProfileService,
    private readonly updateService: UpdateLeaderProfileService,
    private readonly deleteService: DeleteLeaderProfileService,
  ) {}

  findPage(
    req: Request,
    query: LeaderProfilesQueryDto,
  ): Promise<PageDto<LeaderResponseDto>> {
    return this.getService.findPage(req, query);
  }

  list(req: Request): Promise<LeaderSimpleListDto[]> {
    return this.getService.list(req);
  }

  findOne(id: string, req: Request): Promise<LeaderResponseDto> {
    return this.getService.findOne(id, req);
  }

  createForUser(userId: string): Promise<LeaderProfileEntity> {
    return this.createService.createForUser(userId);
  }

  removeByUserId(userId: string): Promise<void> {
    return this.deleteService.removeByUserId(userId);
  }

  manageTeams(
    leaderId: string,
    dto: ManageLeaderTeamsDto,
    req: Request,
  ): Promise<LeaderResponseDto> {
    return this.updateService.manageTeams(leaderId, dto, req);
  }

  manageTeam(
    leaderId: string,
    dto: ManageLeaderTeamDto,
    req: Request,
  ): Promise<LeaderResponseDto> {
    return this.updateService.manageTeam(leaderId, dto, req);
  }

  findMyShelters(req: Request): Promise<ShelterWithLeaderStatusDto[]> {
    return this.getService.findMyShelters(req);
  }
}
