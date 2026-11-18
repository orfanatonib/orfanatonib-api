import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  ParseArrayPipe,
  Query,
  Req,
  UseGuards,
  Put,
  Logger,
} from "@nestjs/common";
import { Request } from "express";
import { GetLeaderProfilesService } from "./services/get-leader-profiles.service";
import { UpdateLeaderProfileService } from "./services/update-leader-profile.service";
import { LeaderResponseDto } from "./dto/leader-profile.response.dto";
import { LeaderSimpleListDto } from "./dto/leader-simple-list.dto";
import {
  PageDto,
  LeaderProfilesQueryDto,
} from "./dto/leader-profiles.query.dto";
import { JwtAuthGuard } from "src/core/auth/guards/jwt-auth.guard";
import { ShelterTeamDto } from "./dto/assign-team.dto";
import { ShelterWithLeaderStatusDto } from "src/shelter/shelter/dto/shelter.response.dto";

@Controller("leader-profiles")
@UseGuards(JwtAuthGuard)
export class LeaderProfilesController {
  private readonly logger = new Logger(LeaderProfilesController.name);

  constructor(
    private readonly getLeaderProfilesService: GetLeaderProfilesService,
    private readonly updateLeaderProfileService: UpdateLeaderProfileService,
  ) {}

  @Get()
  findPage(
    @Req() req: Request,
    @Query() query: LeaderProfilesQueryDto,
  ): Promise<PageDto<LeaderResponseDto>> {
    return this.getLeaderProfilesService.findPage(req, query);
  }

  @Get("simple")
  listSimple(@Req() req: Request): Promise<LeaderSimpleListDto[]> {
    return this.getLeaderProfilesService.list(req);
  }

  @Get("my-shelters")
  findMyShelters(@Req() req: Request): Promise<ShelterWithLeaderStatusDto[]> {
    return this.getLeaderProfilesService.findMyShelters(req);
  }

  @Get(":id")
  findOne(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Req() req: Request,
  ): Promise<LeaderResponseDto> {
    return this.getLeaderProfilesService.findOne(id, req);
  }

  @Put(":leaderId")
  async update(
    @Param("leaderId", new ParseUUIDPipe()) leaderId: string,
    @Body(new ParseArrayPipe({ items: ShelterTeamDto, whitelist: true }))
    dto: ShelterTeamDto[],
    @Req() req: Request,
  ): Promise<LeaderResponseDto> {
    this.logger.log(`Updating leader profile: ${leaderId}`);
    const result = await this.updateLeaderProfileService.manageTeams(
      leaderId,
      { assignments: dto },
      req,
    );
    this.logger.log(`Leader profile updated successfully: ${leaderId}`);
    return result;
  }
}
