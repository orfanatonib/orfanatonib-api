import { Controller, Post, Body, Param, UseGuards, Get, Query, Req, Logger, ParseIntPipe, DefaultValuePipe, ForbiddenException } from '@nestjs/common';
import { JwtAuthGuard } from 'src/core/auth/guards/jwt-auth.guard';
import { AdminOrLeaderRoleGuard } from 'src/core/auth/guards/role-guard';

import { RegisterAttendanceDto } from './dto/register-attendance.dto';
import { RegisterTeamAttendanceDto } from './dto/register-team-attendance.dto';
import { AuthContextService } from 'src/core/auth/services/auth-context.service';
import { Request } from 'express';
import { AuthRequest } from 'src/core/auth/auth.types';
import { AttendanceFiltersDto, PaginatedResponseDto, AttendanceStatsDto, ShelterWithTeamsDto, TeamScheduleDto, AttendanceResponseDto } from './dto/attendance-response.dto';
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
    this.logger.log(`Registering individual attendance. User: ${userId}, Schedule: ${dto.scheduleId}`);
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
    const category = dto.category || AttendanceCategory.VISIT;
    
    this.logger.log(`💾 Registrando frequência: User: ${userId}, Team: ${dto.teamId}, Schedule: ${dto.scheduleId}, Category: ${category}, Attendances: ${dto.attendances.length}`);
    
    if (!userId) throw new ForbiddenException('User not identified');
    
    const results = await this.attendanceWriter.registerTeamAttendance(
      userId,
      dto.teamId,
      dto.scheduleId,
      dto.attendances,
      category
    );
    
    this.logger.log(`✅ Resposta do backend: ${results.length} registro(s) criado(s)`);
    return results;
  }

  @UseGuards(AdminOrLeaderRoleGuard)
  @Get('pending/leader')
  async getLeaderPendings(@Req() req: AuthRequest, @Query('teamId') teamId: string) {
    const userId = req.user?.id ?? (await this.authContext.getUserId(req));
    this.logger.log(`Listing pending schedules for leader. User: ${userId}, Team: ${teamId}`);
    if (!userId) throw new ForbiddenException('User not identified');
    return this.attendanceReader.findPendingsForLeader(userId, teamId, new Date());
  }

  @Get('pending/member')
  async getMemberPendings(@Req() req: AuthRequest) {
    const userId = req.user?.id ?? (await this.authContext.getUserId(req));
    this.logger.log(`Listing pending schedules for member. User: ${userId}`);
    if (!userId) throw new ForbiddenException('User not identified');
    return this.attendanceReader.findPendingsForMember(userId, new Date());
  }

  @UseGuards(AdminOrLeaderRoleGuard)
  @Get('team/:teamId/members')
  async listTeamMembers(@Req() req: AuthRequest, @Param('teamId') teamId: string) {
    const userId = req.user?.id ?? (await this.authContext.getUserId(req));
    this.logger.log(`Listing team members. User: ${userId}, Team: ${teamId}`);
    if (!userId) throw new ForbiddenException('User not identified');
    return this.attendanceReader.listTeamMembers(userId, teamId);
  }

  @Get('team/:teamId/schedules')
  async listTeamSchedules(
    @Req() req: AuthRequest,
    @Param('teamId') teamId: string,
  ): Promise<TeamScheduleDto[]> {
    const userId = req.user?.id ?? (await this.authContext.getUserId(req));
    this.logger.log(`Listing team schedules. User: ${userId}, Team: ${teamId}`);
    if (!userId) throw new ForbiddenException('User not identified');
    return this.attendanceReader.listTeamSchedulesFull(userId, teamId, {} as AttendanceFiltersDto);
  }

  @UseGuards(AdminOrLeaderRoleGuard)
  @Get('leader/teams')
  async listLeaderTeams(@Req() req: AuthRequest) {
    const userId = req.user?.id ?? (await this.authContext.getUserId(req));
    this.logger.log(`Listing leader teams. User: ${userId}`);
    if (!userId) throw new ForbiddenException('User not identified');
    return this.attendanceReader.listLeaderTeams(userId);
  }

  @UseGuards(AdminOrLeaderRoleGuard)
  @Get('leader/teams/members')
  async listLeaderTeamsWithMembers(@Req() req: AuthRequest) {
    const userId = req.user?.id ?? (await this.authContext.getUserId(req));
    this.logger.log(`Listing leader teams with members. User: ${userId}`);
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
    this.logger.log(`Listing hierarchical attendance sheets. User: ${userId}`);
    if (!userId) throw new ForbiddenException('User not identified');
    return this.attendanceReader.listAttendanceSheetsHierarchical(userId, { startDate, endDate });
  }

  @UseGuards(AdminOrLeaderRoleGuard)
  @Get('leader/shelters-teams-members')
  async listLeaderSheltersTeamsMembers(@Req() req: AuthRequest) {
    const userId = req.user?.id ?? (await this.authContext.getUserId(req));
    this.logger.log(`Listing leader shelters, teams, and members. User: ${userId}`);
    if (!userId) throw new ForbiddenException('User not identified');
    return this.attendanceReader.listLeaderTeamsWithMembers(userId);
  }

  @Get('records')
  async listAttendanceRecords(
    @Req() req: AuthRequest,
    @Query() filters: AttendanceFiltersDto,
  ): Promise<PaginatedResponseDto<any>> {
    const userId = req.user?.id ?? (await this.authContext.getUserId(req));
    this.logger.log(`Listing attendance records. User: ${userId}`);
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
    this.logger.log(`Getting attendance stats. User: ${userId}, Team: ${teamId}`);
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
    this.logger.log(`Getting team attendance stats. User: ${userId}, Team: ${teamId}`);
    if (!userId) throw new ForbiddenException('User not identified');
    return this.attendanceReader.getTeamAttendanceStats(userId, teamId, startDate, endDate);
  }
}
