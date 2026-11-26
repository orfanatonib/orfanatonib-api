import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Put,
  Delete,
  UseGuards,
  ParseUUIDPipe,
  Req,
  Logger,
} from "@nestjs/common";
import { Request } from "express";
import { CreateTeamService } from "./services/create-team.service";
import { GetTeamsService } from "./services/get-teams.service";
import { UpdateTeamService } from "./services/update-team.service";
import { DeleteTeamService } from "./services/delete-team.service";
import { CreateTeamDto } from "./dto/create-team.dto";
import { UpdateTeamDto } from "./dto/update-team.dto";
import { TeamResponseDto } from "./dto/team-response.dto";
import { JwtAuthGuard } from "src/core/auth/guards/jwt-auth.guard";
import { AuthContextService } from "src/core/auth/services/auth-context.service";
import { AdminOrLeaderRoleGuard } from "src/core/auth/guards/role-guard";
import type { AuthenticatedRequest } from "src/core/auth/auth.types";
import { toShelterAccessContext } from "src/shelter/shelter/utils/shelter-access.util";
import { FeatureFlagGuard } from "src/core/feature-flags/guards/feature-flag.guard";
import { FeatureFlag } from "src/core/feature-flags/decorators/feature-flag.decorator";
import { FeatureFlagKeys } from "src/core/feature-flags/enums/feature-flag-keys.enum";
import { SHELTER_DIRECTORY_FLAGS } from "src/core/feature-flags/shared-read-flags";

@Controller("teams")
@UseGuards(JwtAuthGuard)
export class TeamsController {
  private readonly logger = new Logger(TeamsController.name);

  constructor(
    private readonly createTeamService: CreateTeamService,
    private readonly getTeamsService: GetTeamsService,
    private readonly updateTeamService: UpdateTeamService,
    private readonly deleteTeamService: DeleteTeamService,
    private readonly authContext: AuthContextService,
  ) {}

  @FeatureFlag(FeatureFlagKeys.SHELTER_MANAGEMENT)
  @UseGuards(FeatureFlagGuard)
  @Post()
  @UseGuards(AdminOrLeaderRoleGuard)
  async create(
    @Req() req: AuthenticatedRequest,
    @Body() dto: CreateTeamDto,
  ): Promise<TeamResponseDto> {
    this.logger.log(`Creating team: ${dto.numberTeam}`);
    const result = await this.createTeamService.executeAs(
      toShelterAccessContext(req),
      dto,
    );
    this.logger.log(`Team created successfully: ${result.id}`);
    return result;
  }

  @FeatureFlag(SHELTER_DIRECTORY_FLAGS)
  @UseGuards(FeatureFlagGuard)
  @Get()
  @UseGuards(AdminOrLeaderRoleGuard)
  async findAll(@Req() req: AuthenticatedRequest): Promise<TeamResponseDto[]> {
    this.logger.log("Fetching teams in the actor scope");
    return this.getTeamsService.findAllAs(toShelterAccessContext(req));
  }

  @FeatureFlag(SHELTER_DIRECTORY_FLAGS)
  @UseGuards(FeatureFlagGuard)
  @Get("my-teams")
  async findMyTeams(@Req() req: Request): Promise<TeamResponseDto[]> {
    const userId = await this.authContext.getUserId(req);
    const role = await this.authContext.getRole(req);

    if (!userId || !role) {
      this.logger.log("User not identified for my-teams request");
      return [];
    }

    this.logger.log(`Fetching teams for user ${userId} with role ${role}`);
    return this.getTeamsService.findByUserContext(userId, role);
  }

  @FeatureFlag(SHELTER_DIRECTORY_FLAGS)
  @UseGuards(FeatureFlagGuard)
  @Get("by-shelter/:shelterId")
  @UseGuards(AdminOrLeaderRoleGuard)
  async findByShelter(
    @Req() req: AuthenticatedRequest,
    @Param("shelterId", new ParseUUIDPipe()) shelterId: string,
  ): Promise<TeamResponseDto[]> {
    this.logger.log(`Fetching teams for shelter ${shelterId}`);
    return this.getTeamsService.findByShelterAs(
      toShelterAccessContext(req),
      shelterId,
    );
  }

  @FeatureFlag(SHELTER_DIRECTORY_FLAGS)
  @UseGuards(FeatureFlagGuard)
  @Get(":id")
  @UseGuards(AdminOrLeaderRoleGuard)
  async findOne(
    @Req() req: AuthenticatedRequest,
    @Param("id", new ParseUUIDPipe()) id: string,
  ): Promise<TeamResponseDto> {
    this.logger.log(`Fetching team ${id}`);
    return this.getTeamsService.findOneAs(toShelterAccessContext(req), id);
  }

  @FeatureFlag(FeatureFlagKeys.SHELTER_MANAGEMENT)
  @UseGuards(FeatureFlagGuard)
  @Put(":id")
  @UseGuards(AdminOrLeaderRoleGuard)
  async update(
    @Req() req: AuthenticatedRequest,
    @Param("id", new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateTeamDto,
  ): Promise<TeamResponseDto> {
    this.logger.log(`Updating team ${id}`);
    const result = await this.updateTeamService.executeAs(
      toShelterAccessContext(req),
      id,
      dto,
    );
    this.logger.log(`Team updated successfully: ${id}`);
    return result;
  }

  @FeatureFlag(FeatureFlagKeys.SHELTER_MANAGEMENT)
  @UseGuards(FeatureFlagGuard)
  @Delete(":id")
  @UseGuards(AdminOrLeaderRoleGuard)
  async remove(
    @Req() req: AuthenticatedRequest,
    @Param("id", new ParseUUIDPipe()) id: string,
  ): Promise<void> {
    this.logger.log(`Deleting team ${id}`);
    await this.deleteTeamService.executeAs(toShelterAccessContext(req), id);
    this.logger.log(`Team deleted successfully: ${id}`);
  }
}
