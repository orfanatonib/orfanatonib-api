import { Controller, Post, Body, Param, UseGuards, Get, Query, Req, ForbiddenException, Logger } from '@nestjs/common';
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
  private readonly logger = new Logger(AttendanceController.name);

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
    this.logger.log(`Registering attendance for user ${userId}, schedule ${dto.scheduleId}`);
    const result = await this.attendanceWriter.registerAttendance(
      userId,
      dto.scheduleId,
      dto.type,
      dto.comment,
      dto.category || AttendanceCategory.VISIT
    );
    this.logger.log(`Attendance registered successfully for user ${userId}`);
    return result;
  }

  @UseGuards(AdminOrLeaderRoleGuard)
  @Post('register/team')
  async registerTeamAttendance(
    @Req() req: AuthRequest,
    @Body() dto: RegisterTeamAttendanceDto,
  ): Promise<AttendanceResponseDto[]> {
    const userId = req.user?.id ?? (await this.authContext.getUserId(req));
    if (!userId) throw new ForbiddenException('User not identified');
    this.logger.log(`Registering team attendance for team ${dto.teamId}, schedule ${dto.scheduleId}`);
    const result = await this.attendanceWriter.registerTeamAttendance(
      userId,
      dto.teamId,
      dto.scheduleId,
      dto.attendances,
      dto.category || AttendanceCategory.VISIT
    );
    this.logger.log(`Team attendance registered successfully for team ${dto.teamId}`);
    return result;
  }

  @Get('pending/all')
  async getAllPendings(@Req() req: AuthRequest) {
    const userId = req.user?.id ?? (await this.authContext.getUserId(req));
    if (!userId) throw new ForbiddenException('User not identified');
    this.logger.log(`Fetching all pending attendances for user ${userId}`);
    return this.attendanceReader.findAllPendings(userId, new Date());
  }

  @UseGuards(AdminOrLeaderRoleGuard)
  @Get('team/:teamId/members')
  async listTeamMembers(@Req() req: AuthRequest, @Param('teamId') teamId: string) {
    const userId = req.user?.id ?? (await this.authContext.getUserId(req));
    if (!userId) throw new ForbiddenException('User not identified');
    this.logger.log(`Listing team members for team ${teamId}`);
    return this.attendanceReader.listTeamMembers(userId, teamId);
  }

  @Get('team/:teamId/schedules')
  async listTeamSchedules(
    @Req() req: AuthRequest,
    @Param('teamId') teamId: string,
  ): Promise<TeamScheduleDto[]> {
    const userId = req.user?.id ?? (await this.authContext.getUserId(req));
    if (!userId) throw new ForbiddenException('User not identified');
    this.logger.log(`Listing schedules for team ${teamId}`);
    return this.attendanceReader.listTeamSchedulesFull(userId, teamId, {} as AttendanceFiltersDto);
  }

  @UseGuards(AdminOrLeaderRoleGuard)
  @Get('leader/teams')
  async listLeaderTeams(@Req() req: AuthRequest) {
    const userId = req.user?.id ?? (await this.authContext.getUserId(req));
    if (!userId) throw new ForbiddenException('User not identified');
    this.logger.log(`Listing leader teams for user ${userId}`);
    return this.attendanceReader.listLeaderTeams(userId);
  }

  @UseGuards(AdminOrLeaderRoleGuard)
  @Get('leader/teams/members')
  async listLeaderTeamsWithMembers(@Req() req: AuthRequest) {
    const userId = req.user?.id ?? (await this.authContext.getUserId(req));
    if (!userId) throw new ForbiddenException('User not identified');
    this.logger.log(`Listing leader teams with members for user ${userId}`);
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
    this.logger.log(`Listing hierarchical attendance sheets for user ${userId}`);
    return this.attendanceReader.listAttendanceSheetsHierarchical(userId, { startDate, endDate });
  }

  @UseGuards(AdminOrLeaderRoleGuard)
  @Get('leader/shelters-teams-members')
  async listLeaderSheltersTeamsMembers(@Req() req: AuthRequest) {
    const userId = req.user?.id ?? (await this.authContext.getUserId(req));
    if (!userId) throw new ForbiddenException('User not identified');
    this.logger.log(`Listing leader shelters teams members for user ${userId}`);
    return this.attendanceReader.listLeaderTeamsWithMembers(userId);
  }

  @Get('records')
  async listAttendanceRecords(
    @Req() req: AuthRequest,
    @Query() filters: AttendanceFiltersDto,
  ): Promise<PaginatedResponseDto<any>> {
    const userId = req.user?.id ?? (await this.authContext.getUserId(req));
    if (!userId) throw new ForbiddenException('User not identified');
    this.logger.log(`Listing attendance records for user ${userId}`);
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
    this.logger.log(`Getting attendance stats for user ${userId}`);
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
    this.logger.log(`Getting team attendance stats for team ${teamId}`);
    return this.attendanceReader.getTeamAttendanceStats(userId, teamId, startDate, endDate);
  }
}
