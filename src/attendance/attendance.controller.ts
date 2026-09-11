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

  @Post("register")
  registerAttendance(
    @Req() request: AuthenticatedRequest,
    @Body() dto: RegisterAttendanceDto,
  ): Promise<AttendanceResponseDto> {
    return this.registerService.registerOwn(toAttendanceActor(request), dto);
  }

  @UseGuards(AdminOrLeaderRoleGuard)
  @Post("register/team")
  registerTeamAttendance(
    @Req() request: AuthenticatedRequest,
    @Body() dto: RegisterTeamAttendanceDto,
  ): Promise<AttendanceResponseDto[]> {
    return this.registerService.registerTeam(toAttendanceActor(request), dto);
  }

  @Get("pending/all")
  getAllPendings(
    @Req() request: AuthenticatedRequest,
  ): Promise<AllPendingsResponseDto> {
    return this.pendingsService.execute(toAttendanceActor(request), new Date());
  }

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

  @UseGuards(AdminOrLeaderRoleGuard)
  @Get("leader/teams")
  listLeaderTeams(
    @Req() request: AuthenticatedRequest,
  ): Promise<LeaderTeamDto[]> {
    return this.teamsService.listLeaderTeams(toAttendanceActor(request));
  }

  @UseGuards(AdminOrLeaderRoleGuard)
  @Get("leader/teams/members")
  listLeaderTeamsWithMembers(
    @Req() request: AuthenticatedRequest,
  ): Promise<ShelterTeamsMembersDto[]> {
    return this.teamsService.listLeaderTeamsWithMembers(
      toAttendanceActor(request),
    );
  }

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

  @Get("records")
  listAttendanceRecords(
    @Req() request: AuthenticatedRequest,
    @Query() filters: AttendanceFiltersDto,
  ): Promise<PaginatedResponseDto<AttendanceRecordListItemDto>> {
    return this.recordsService.execute(toAttendanceActor(request), filters);
  }

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
