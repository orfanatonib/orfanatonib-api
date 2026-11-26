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
import { FeatureFlagGuard } from "src/core/feature-flags/guards/feature-flag.guard";
import { FeatureFlag } from "src/core/feature-flags/decorators/feature-flag.decorator";
import { FeatureFlagKeys } from "src/core/feature-flags/enums/feature-flag-keys.enum";
import { SHELTER_DIRECTORY_FLAGS } from "src/core/feature-flags/shared-read-flags";

@Controller("leader-profiles")
@UseGuards(JwtAuthGuard)
export class LeaderProfilesController {
  private readonly logger = new Logger(LeaderProfilesController.name);

  constructor(
    private readonly getLeaderProfilesService: GetLeaderProfilesService,
    private readonly updateLeaderProfileService: UpdateLeaderProfileService,
  ) {}

  @FeatureFlag(FeatureFlagKeys.LEADER_MANAGEMENT)
  @UseGuards(FeatureFlagGuard)
  @Get()
  findPage(
    @Req() req: Request,
    @Query() query: LeaderProfilesQueryDto,
  ): Promise<PageDto<LeaderResponseDto>> {
    return this.getLeaderProfilesService.findPage(req, query);
  }

  @FeatureFlag(SHELTER_DIRECTORY_FLAGS)
  @UseGuards(FeatureFlagGuard)
  @Get("simple")
  listSimple(@Req() req: Request): Promise<LeaderSimpleListDto[]> {
    return this.getLeaderProfilesService.list(req);
  }

  @FeatureFlag(SHELTER_DIRECTORY_FLAGS)
  @UseGuards(FeatureFlagGuard)
  @Get("my-shelters")
  findMyShelters(@Req() req: Request): Promise<ShelterWithLeaderStatusDto[]> {
    return this.getLeaderProfilesService.findMyShelters(req);
  }

  @FeatureFlag(FeatureFlagKeys.LEADER_MANAGEMENT)
  @UseGuards(FeatureFlagGuard)
  @Get(":id")
  findOne(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Req() req: Request,
  ): Promise<LeaderResponseDto> {
    return this.getLeaderProfilesService.findOne(id, req);
  }

  @FeatureFlag(FeatureFlagKeys.LEADER_MANAGEMENT)
  @UseGuards(FeatureFlagGuard)
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
