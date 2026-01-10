import { Controller, Post, Body, Param, UseGuards, Get, Query, Req, Logger, ParseIntPipe, DefaultValuePipe } from '@nestjs/common';
import { JwtAuthGuard } from 'src/core/auth/guards/jwt-auth.guard';
import { AdminOrLeaderRoleGuard } from 'src/core/auth/guards/role-guard';
import { AttendanceService } from './attendance.service';
import { RegisterAttendanceDto } from './dto/register-attendance.dto';
import { RegisterTeamAttendanceDto } from './dto/register-team-attendance.dto';
import { AuthContextService } from 'src/core/auth/services/auth-context.service';
import { Request } from 'express';
import { AttendanceFiltersDto, PaginatedResponseDto, AttendanceStatsDto, ShelterWithTeamsDto } from './dto/attendance-response.dto';

@Controller('attendance')
@UseGuards(JwtAuthGuard)
export class AttendanceController {
  private readonly logger = new Logger(AttendanceController.name);

  constructor(
    private readonly attendanceService: AttendanceService,
    private readonly authContext: AuthContextService,
  ) {}

  /**
   * Membro registra sua própria presença/falta
   * Endpoint: POST /attendance/register
   */
  @Post('register')
  async registerAttendance(
    @Req() req: Request,
    @Body() dto: RegisterAttendanceDto,
  ) {
    const userId = (req as any).user?.id ?? (await this.authContext.getUserId(req));
    const role = (req as any).user?.role ?? (await this.authContext.getRole(req));
    return this.attendanceService.registerAttendance(
      userId,
      dto.scheduleId,
      dto.type,
      dto.comment,
    );
  }

  /**
   * Líder registra presença/falta em lote (pagela) para todos os membros da equipe
   * Endpoint: POST /attendance/register/team
   */
  @UseGuards(AdminOrLeaderRoleGuard)
  @Post('register/team')
  async registerTeamAttendance(
    @Req() req: Request,
    @Body() dto: RegisterTeamAttendanceDto,
  ) {
    const userId = (req as any).user?.id ?? (await this.authContext.getUserId(req));
    const role = (req as any).user?.role ?? (await this.authContext.getRole(req));
    return this.attendanceService.registerTeamAttendance(
      userId,
      dto.teamId,
      dto.scheduleId,
      dto.attendances,
    );
  }

  /**
   * Endpoint de pendências para líder
   * Retorna reuniões e visitas já realizadas sem lançamento de presença/falta
   * Endpoint: GET /attendance/pending/leader?teamId=xxx
   */
  @UseGuards(AdminOrLeaderRoleGuard)
  @Get('pending/leader')
  async getLeaderPendings(@Req() req: Request, @Query('teamId') teamId: string) {
    const userId = (req as any).user?.id ?? (await this.authContext.getUserId(req));
    const role = (req as any).user?.role ?? (await this.authContext.getRole(req));
    return this.attendanceService.findPendingsForLeader(userId, teamId, new Date());
  }

  /**
   * Endpoint de pendências para membro
   * Retorna reuniões e visitas já realizadas em que o membro não registrou presença/ausência
   * Endpoint: GET /attendance/pending/member
   */
  @Get('pending/member')
  async getMemberPendings(@Req() req: Request) {
    const userId = (req as any).user?.id ?? (await this.authContext.getUserId(req));
    const role = (req as any).user?.role ?? (await this.authContext.getRole(req));
    return this.attendanceService.findPendingsForMember(userId, new Date());
  }

  /**
   * Lista membros de um time
   * Endpoint: GET /attendance/team/:teamId/members
   */
  @UseGuards(AdminOrLeaderRoleGuard)
  @Get('team/:teamId/members')
  async listTeamMembers(@Req() req: Request, @Param('teamId') teamId: string) {
    const userId = (req as any).user?.id ?? (await this.authContext.getUserId(req));
    const role = (req as any).user?.role ?? (await this.authContext.getRole(req));
    return this.attendanceService.listTeamMembers(userId, teamId);
  }

  /**
   * Lista reuniões e visitas de um time com paginação e filtros
   * Endpoint: GET /attendance/team/:teamId/schedules?page=1&limit=20&startDate=2024-01-01&endDate=2024-12-31
   */
  @Get('team/:teamId/schedules')
  async listTeamSchedules(
    @Req() req: Request,
    @Param('teamId') teamId: string,
    @Query() filters: AttendanceFiltersDto,
  ): Promise<PaginatedResponseDto<any>> {
    const userId = (req as any).user?.id ?? (await this.authContext.getUserId(req));
    const role = (req as any).user?.role ?? (await this.authContext.getRole(req));
    return this.attendanceService.listTeamSchedulesPaginated(userId, teamId, filters);
  }

  /**
   * Lista times e abrigos do líder autenticado
   * Endpoint: GET /attendance/leader/teams
   */
  @UseGuards(AdminOrLeaderRoleGuard)
  @Get('leader/teams')
  async listLeaderTeams(@Req() req: Request) {
    const userId = (req as any).user?.id ?? (await this.authContext.getUserId(req));
    const role = (req as any).user?.role ?? (await this.authContext.getRole(req));
    return this.attendanceService.listLeaderTeams(userId);
  }

  /**
   * Lista abrigos e equipes do líder, incluindo membros da equipe
   * Endpoint: GET /attendance/leader/teams/members
   */
  @UseGuards(AdminOrLeaderRoleGuard)
  @Get('leader/teams/members')
  async listLeaderTeamsWithMembers(@Req() req: Request) {
    const userId = (req as any).user?.id ?? (await this.authContext.getUserId(req));
    const role = (req as any).user?.role ?? (await this.authContext.getRole(req));
    return this.attendanceService.listLeaderTeamsWithMembers(userId);
  }

  /**
   * Lista pagelas hierarquicamente: abrigos[] --> equipes[] --> agendamentos[] com registros de presença
   * Endpoint: GET /attendance/sheets/hierarchical?startDate=2024-01-01&endDate=2024-12-31
   */
  @UseGuards(AdminOrLeaderRoleGuard)
  @Get('sheets/hierarchical')
  async listAttendanceSheetsHierarchical(
    @Req() req: Request,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ): Promise<ShelterWithTeamsDto[]> {
    const userId = (req as any).user?.id ?? (await this.authContext.getUserId(req));
    const role = (req as any).user?.role ?? (await this.authContext.getRole(req));
    return this.attendanceService.listAttendanceSheetsHierarchical(userId, { startDate, endDate });
  }

  /**
   * Lista hierarquia completa: abrigos[] --> equipes[] --> membros[] onde o líder faz parte
   * Endpoint: GET /attendance/leader/shelters-teams-members
   */
  @UseGuards(AdminOrLeaderRoleGuard)
  @Get('leader/shelters-teams-members')
  async listLeaderSheltersTeamsMembers(@Req() req: Request) {
    const userId = (req as any).user?.id ?? (await this.authContext.getUserId(req));
    const role = (req as any).user?.role ?? (await this.authContext.getRole(req));
    return this.attendanceService.listLeaderTeamsWithMembers(userId);
  }

  /**
   * Lista registros de presença com filtros e paginação
   * Endpoint: GET /attendance/records?page=1&limit=20&startDate=2024-01-01&endDate=2024-12-31&type=present&teamId=xxx&memberId=xxx
   */
  @Get('records')
  async listAttendanceRecords(
    @Req() req: Request,
    @Query() filters: AttendanceFiltersDto,
  ): Promise<PaginatedResponseDto<any>> {
    const userId = (req as any).user?.id ?? (await this.authContext.getUserId(req));
    const role = (req as any).user?.role ?? (await this.authContext.getRole(req));
    return this.attendanceService.listAttendanceRecords(userId, filters);
  }

  /**
   * Estatísticas de presença do usuário
   * Endpoint: GET /attendance/stats?teamId=xxx&startDate=2024-01-01&endDate=2024-12-31
   */
  @Get('stats')
  async getAttendanceStats(
    @Req() req: Request,
    @Query('teamId') teamId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ): Promise<AttendanceStatsDto> {
    const userId = (req as any).user?.id ?? (await this.authContext.getUserId(req));
    const role = (req as any).user?.role ?? (await this.authContext.getRole(req));
    return this.attendanceService.getAttendanceStats(userId, teamId, startDate, endDate);
  }

  /**
   * Estatísticas de presença por time (apenas para líderes)
   * Endpoint: GET /attendance/leader/stats/team/:teamId?startDate=2024-01-01&endDate=2024-12-31
   */
  @UseGuards(AdminOrLeaderRoleGuard)
  @Get('leader/stats/team/:teamId')
  async getTeamAttendanceStats(
    @Req() req: Request,
    @Param('teamId') teamId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ): Promise<AttendanceStatsDto> {
    const userId = (req as any).user?.id ?? (await this.authContext.getUserId(req));
    const role = (req as any).user?.role ?? (await this.authContext.getRole(req));
    return this.attendanceService.getTeamAttendanceStats(userId, teamId, startDate, endDate);
  }
}
