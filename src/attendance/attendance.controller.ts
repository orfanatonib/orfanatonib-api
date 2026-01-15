import { Controller, Post, Body, Param, UseGuards, Get, Query, Req, ForbiddenException } from '@nestjs/common';
import { JwtAuthGuard } from 'src/core/auth/guards/jwt-auth.guard';
import { AdminOrLeaderRoleGuard } from 'src/core/auth/guards/role-guard';

import { RegisterAttendanceDto } from './dto/register-attendance.dto';
import { RegisterTeamAttendanceDto } from './dto/register-team-attendance.dto';
import { AuthContextService } from 'src/core/auth/services/auth-context.service';
import { AuthRequest } from 'src/core/auth/auth.types';
import { AttendanceFiltersDto, PaginatedResponseDto, TeamScheduleDto, AttendanceResponseDto } from './dto/attendance-response.dto';
import { AttendanceCategory } from './entities/attendance.entity';

import { AttendanceReaderService } from './services/attendance-reader.service';
import { AttendanceWriterService } from './services/attendance-writer.service';

@Controller('attendance')
@UseGuards(JwtAuthGuard)
export class AttendanceController {
  constructor(
    private readonly attendanceReader: AttendanceReaderService,
    private readonly attendanceWriter: AttendanceWriterService,
    private readonly authContext: AuthContextService,
  ) { }

  @Post('register')
  async registerAttendance(
    @Req() req: AuthRequest,
    @Body() dto: RegisterAttendanceDto,
  ): Promise<AttendanceResponseDto> {
    const userId = req.user?.id ?? (await this.authContext.getUserId(req));
    if (!userId) throw new ForbiddenException('User not identified');
    return this.attendanceWriter.registerAttendance(
      userId,
      dto.scheduleId,
      dto.type,
      dto.comment,
      dto.category || AttendanceCategory.VISIT
    );
  }

  @UseGuards(AdminOrLeaderRoleGuard)
  @Post('register/team')
  async registerTeamAttendance(
    @Req() req: AuthRequest,
    @Body() dto: RegisterTeamAttendanceDto,
  ): Promise<AttendanceResponseDto[]> {
    const userId = req.user?.id ?? (await this.authContext.getUserId(req));
    if (!userId) throw new ForbiddenException('User not identified');

    return this.attendanceWriter.registerTeamAttendance(
      userId,
      dto.teamId,
      dto.scheduleId,
      dto.attendances,
      dto.category || AttendanceCategory.VISIT
    );
  }

  @Get('pending/all')
  async getAllPendings(@Req() req: AuthRequest) {
    const userId = req.user?.id ?? (await this.authContext.getUserId(req));
    if (!userId) throw new ForbiddenException('User not identified');
    return this.attendanceReader.findAllPendings(userId, new Date());
  }

  @UseGuards(AdminOrLeaderRoleGuard)
  @Get('team/:teamId/members')
  async listTeamMembers(@Req() req: AuthRequest, @Param('teamId') teamId: string) {
    const userId = req.user?.id ?? (await this.authContext.getUserId(req));
    if (!userId) throw new ForbiddenException('User not identified');
    return this.attendanceReader.listTeamMembers(userId, teamId);
  }

  @Get('team/:teamId/schedules')
  async listTeamSchedules(
    @Req() req: AuthRequest,
    @Param('teamId') teamId: string,
  ): Promise<TeamScheduleDto[]> {
    const userId = req.user?.id ?? (await this.authContext.getUserId(req));
    if (!userId) throw new ForbiddenException('User not identified');
    return this.attendanceReader.listTeamSchedulesFull(userId, teamId, {} as AttendanceFiltersDto);
  }

  @UseGuards(AdminOrLeaderRoleGuard)
  @Get('leader/teams')
  async listLeaderTeams(@Req() req: AuthRequest) {
    const userId = req.user?.id ?? (await this.authContext.getUserId(req));
    if (!userId) throw new ForbiddenException('User not identified');
    return this.attendanceReader.listLeaderTeams(userId);
  }

  @UseGuards(AdminOrLeaderRoleGuard)
  @Get('leader/teams/members')
  async listLeaderTeamsWithMembers(@Req() req: AuthRequest) {
    const userId = req.user?.id ?? (await this.authContext.getUserId(req));
    if (!userId) throw new ForbiddenException('User not identified');
    return this.attendanceReader.listLeaderTeamsWithMembers(userId);
  }

  @UseGuards(AdminOrLeaderRoleGuard)
  @Get('sheets/hierarchical')
  async listAttendanceSheetsHierarchical(
    @Req() req: AuthRequest,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const userId = req.user?.id ?? (await this.authContext.getUserId(req));
    if (!userId) throw new ForbiddenException('User not identified');
    return this.attendanceReader.listAttendanceSheetsHierarchical(userId, { startDate, endDate });
  }

  @UseGuards(AdminOrLeaderRoleGuard)
  @Get('leader/shelters-teams-members')
  async listLeaderSheltersTeamsMembers(@Req() req: AuthRequest) {
    const userId = req.user?.id ?? (await this.authContext.getUserId(req));
    if (!userId) throw new ForbiddenException('User not identified');
    return this.attendanceReader.listLeaderTeamsWithMembers(userId);
  }

  @Get('records')
  async listAttendanceRecords(
    @Req() req: AuthRequest,
    @Query() filters: AttendanceFiltersDto,
  ): Promise<PaginatedResponseDto<any>> {
    const userId = req.user?.id ?? (await this.authContext.getUserId(req));
    if (!userId) throw new ForbiddenException('User not identified');
    return this.attendanceReader.listAttendanceRecords(userId, filters);
  }

  @Get('stats')
  async getAttendanceStats(
    @Req() req: AuthRequest,
    @Query('teamId') teamId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string
  ) {
    const userId = req.user?.id ?? (await this.authContext.getUserId(req));
    if (!userId) throw new ForbiddenException('User not identified');
    return this.attendanceReader.getAttendanceStats(userId, teamId, startDate, endDate);
  }

  @UseGuards(AdminOrLeaderRoleGuard)
  @Get('leader/stats/team/:teamId')
  async getTeamAttendanceStats(
    @Req() req: AuthRequest,
    @Param('teamId') teamId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string
  ) {
    const userId = req.user?.id ?? (await this.authContext.getUserId(req));
    if (!userId) throw new ForbiddenException('User not identified');
    return this.attendanceReader.getTeamAttendanceStats(userId, teamId, startDate, endDate);
  }
}
