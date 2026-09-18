import { Injectable } from "@nestjs/common";
import { Request } from "express";
import { GetMemberProfilesService } from "./get-member-profiles.service";
import { CreateMemberProfileService } from "./create-member-profile.service";
import { UpdateMemberProfileService } from "./update-member-profile.service";
import { DeleteMemberProfileService } from "./delete-member-profile.service";
import { MemberResponseDto } from "../dto/member-profile.response.dto";
import { MemberSimpleListDto } from "../dto/member-simple-list.dto";
import { MemberProfileEntity } from "../entities/member-profile.entity/member-profile.entity";
import { MemberProfilesQueryDto, PageDto } from "../dto/member-profiles.query.dto";
import { ManageMemberTeamDto } from "../dto/assign-team.dto";

@Injectable()
export class MemberProfilesService {
  constructor(
    private readonly getService: GetMemberProfilesService,
    private readonly createService: CreateMemberProfileService,
    private readonly updateService: UpdateMemberProfileService,
    private readonly deleteService: DeleteMemberProfileService,
  ) {}

  findPage(
    req: Request,
    query: MemberProfilesQueryDto,
  ): Promise<PageDto<MemberResponseDto>> {
    return this.getService.findPage(req, query);
  }

  list(req: Request): Promise<MemberSimpleListDto[]> {
    return this.getService.list(req);
  }

  findOne(id: string, req: Request): Promise<MemberResponseDto> {
    return this.getService.findOne(id, req);
  }

  createForUser(userId: string): Promise<MemberProfileEntity> {
    return this.createService.createForUser(userId);
  }

  removeByUserId(userId: string): Promise<void> {
    return this.deleteService.removeByUserId(userId);
  }

  assignTeamForUser(userId: string, teamId: string): Promise<void> {
    return this.updateService.assignTeamForUser(userId, teamId);
  }

  manageTeam(
    memberId: string,
    dto: ManageMemberTeamDto,
    req: Request,
  ): Promise<MemberResponseDto> {
    return this.updateService.manageTeam(memberId, dto, req);
  }
}
