import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";

import { AuthenticatedRequest } from "src/core/auth/auth.types";
import { JwtAuthGuard } from "src/core/auth/guards/jwt-auth.guard";
import { AdminOrLeaderRoleGuard } from "src/core/auth/guards/role-guard";

import { RegisterAttendanceDto } from "./dto/register-attendance.dto";
import { RegisterTeamAttendanceDto } from "./dto/register-team-attendance.dto";
import {
  AttendanceFiltersDto,
  AttendancePeriodDto,
} from "./dto/attendance-filters.dto";
import {
  AllPendingsResponseDto,
  AttendanceRecordListItemDto,
  AttendanceResponseDto,
  AttendanceStatsDto,
  LeaderTeamDto,
  PaginatedResponseDto,
  ShelterTeamsMembersDto,
  ShelterWithTeamsDto,
  TeamMembersDto,
  TeamScheduleDto,
} from "./dto/attendance-response.dto";

import { GetPendingsService } from "./services/get-pendings.service";
import { GetRecordsService } from "./services/get-records.service";
import { GetSchedulesService } from "./services/get-schedules.service";
import { GetStatsService } from "./services/get-stats.service";
import { GetTeamsService } from "./services/get-teams.service";
import { RegisterAttendanceService } from "./services/register-attendance.service";
import { toAttendanceActor } from "./utils/attendance-scope.util";
import { FeatureFlagGuard } from "src/core/feature-flags/guards/feature-flag.guard";
import { FeatureFlag } from "src/core/feature-flags/decorators/feature-flag.decorator";
import { FeatureFlagKeys } from "src/core/feature-flags/enums/feature-flag-keys.enum";

@Controller("attendance")
@UseGuards(JwtAuthGuard)
export class AttendanceController {
  constructor(
    private readonly registerService: RegisterAttendanceService,
    private readonly pendingsService: GetPendingsService,
    private readonly teamsService: GetTeamsService,
    private readonly schedulesService: GetSchedulesService,
    private readonly recordsService: GetRecordsService,
    private readonly statsService: GetStatsService,
  ) {}

  @FeatureFlag(FeatureFlagKeys.ATTENDANCE)
  @UseGuards(FeatureFlagGuard)
  @Post("register")
  registerAttendance(
    @Req() request: AuthenticatedRequest,
    @Body() dto: RegisterAttendanceDto,
  ): Promise<AttendanceResponseDto> {
    return this.registerService.registerOwn(toAttendanceActor(request), dto);
  }

  @FeatureFlag(FeatureFlagKeys.ATTENDANCE)
  @UseGuards(FeatureFlagGuard)
  @UseGuards(AdminOrLeaderRoleGuard)
  @Post("register/team")
  registerTeamAttendance(
    @Req() request: AuthenticatedRequest,
    @Body() dto: RegisterTeamAttendanceDto,
  ): Promise<AttendanceResponseDto[]> {
    return this.registerService.registerTeam(toAttendanceActor(request), dto);
  }

  @FeatureFlag(FeatureFlagKeys.ATTENDANCE)
  @UseGuards(FeatureFlagGuard)
  @Get("pending/all")
  getAllPendings(
    @Req() request: AuthenticatedRequest,
  ): Promise<AllPendingsResponseDto> {
    return this.pendingsService.execute(toAttendanceActor(request), new Date());
  }

  @FeatureFlag(FeatureFlagKeys.ATTENDANCE)
  @UseGuards(FeatureFlagGuard)
  @UseGuards(AdminOrLeaderRoleGuard)
  @Get("team/:teamId/members")
  listTeamMembers(
    @Req() request: AuthenticatedRequest,
    @Param("teamId", new ParseUUIDPipe()) teamId: string,
  ): Promise<TeamMembersDto> {
    return this.teamsService.listTeamMembers(
      toAttendanceActor(request),
      teamId,
    );
  }

  @FeatureFlag(FeatureFlagKeys.ATTENDANCE)
  @UseGuards(FeatureFlagGuard)
  @Get("team/:teamId/schedules")
  listTeamSchedules(
    @Req() request: AuthenticatedRequest,
    @Param("teamId", new ParseUUIDPipe()) teamId: string,
    @Query() period: AttendancePeriodDto,
  ): Promise<TeamScheduleDto[]> {
    return this.schedulesService.listTeamSchedules(
      toAttendanceActor(request),
      teamId,
      period,
    );
  }

  @FeatureFlag(FeatureFlagKeys.ATTENDANCE)
  @UseGuards(FeatureFlagGuard)
  @UseGuards(AdminOrLeaderRoleGuard)
  @Get("leader/teams")
  listLeaderTeams(
    @Req() request: AuthenticatedRequest,
  ): Promise<LeaderTeamDto[]> {
    return this.teamsService.listLeaderTeams(toAttendanceActor(request));
  }

  @FeatureFlag(FeatureFlagKeys.ATTENDANCE)
  @UseGuards(FeatureFlagGuard)
  @UseGuards(AdminOrLeaderRoleGuard)
  @Get("leader/teams/members")
  listLeaderTeamsWithMembers(
    @Req() request: AuthenticatedRequest,
  ): Promise<ShelterTeamsMembersDto[]> {
    return this.teamsService.listLeaderTeamsWithMembers(
      toAttendanceActor(request),
    );
  }

  @FeatureFlag(FeatureFlagKeys.ATTENDANCE)
  @UseGuards(FeatureFlagGuard)
  @UseGuards(AdminOrLeaderRoleGuard)
  @Get("sheets/hierarchical")
  listSheetsHierarchical(
    @Req() request: AuthenticatedRequest,
    @Query() period: AttendancePeriodDto,
  ): Promise<ShelterWithTeamsDto[]> {
    return this.schedulesService.listSheetsHierarchical(
      toAttendanceActor(request),
      period,
    );
  }

  @FeatureFlag(FeatureFlagKeys.ATTENDANCE)
  @UseGuards(FeatureFlagGuard)
  @Get("records")
  listAttendanceRecords(
    @Req() request: AuthenticatedRequest,
    @Query() filters: AttendanceFiltersDto,
  ): Promise<PaginatedResponseDto<AttendanceRecordListItemDto>> {
    return this.recordsService.execute(toAttendanceActor(request), filters);
  }

  @FeatureFlag(FeatureFlagKeys.ATTENDANCE)
  @UseGuards(FeatureFlagGuard)
  @Get("stats")
  getAttendanceStats(
    @Req() request: AuthenticatedRequest,
    @Query() filters: AttendanceFiltersDto,
  ): Promise<AttendanceStatsDto> {
    return this.statsService.forMember(toAttendanceActor(request), {
      teamId: filters.teamId,
      startDate: filters.startDate,
      endDate: filters.endDate,
    });
  }

  @FeatureFlag(FeatureFlagKeys.ATTENDANCE)
  @UseGuards(FeatureFlagGuard)
  @UseGuards(AdminOrLeaderRoleGuard)
  @Get("leader/stats/team/:teamId")
  getTeamAttendanceStats(
    @Req() request: AuthenticatedRequest,
    @Param("teamId", new ParseUUIDPipe()) teamId: string,
    @Query() period: AttendancePeriodDto,
  ): Promise<AttendanceStatsDto> {
    return this.statsService.forTeam(
      toAttendanceActor(request),
      teamId,
      period,
    );
  }
}
