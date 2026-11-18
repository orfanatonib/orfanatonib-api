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

  @Get()
  async findAll(): Promise<TeamResponseDto[]> {
    this.logger.log("Fetching all teams");
    return this.getTeamsService.findAll();
  }

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

  @Get("by-shelter/:shelterId")
  async findByShelter(
    @Param("shelterId", new ParseUUIDPipe()) shelterId: string,
  ): Promise<TeamResponseDto[]> {
    this.logger.log(`Fetching teams for shelter ${shelterId}`);
    return this.getTeamsService.findByShelter(shelterId);
  }

  @Get(":id")
  async findOne(
    @Param("id", new ParseUUIDPipe()) id: string,
  ): Promise<TeamResponseDto> {
    this.logger.log(`Fetching team ${id}`);
    return this.getTeamsService.findOne(id);
  }

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
