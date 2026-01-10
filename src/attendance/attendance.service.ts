import { Injectable, NotFoundException, ForbiddenException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { AttendanceEntity, AttendanceType } from './entities/attendance.entity';
import { UserEntity } from 'src/core/user/entities/user.entity';
import { ShelterScheduleEntity } from 'src/shelter/schedule/entities/shelter-schedule.entity';
import { TeamEntity } from 'src/shelter/team/entities/team.entity';
import { PendingForLeaderDto, PendingForMemberDto, AttendanceResponseDto, AttendanceFiltersDto, PaginatedResponseDto, AttendanceStatsDto, TeamScheduleDto, PendingMemberDto, ShelterWithTeamsDto, TeamWithSchedulesDto, ScheduleWithAttendanceDto, AttendanceRecordDto } from './dto/attendance-response.dto';
import { UserRole } from 'src/core/auth/auth.types';

@Injectable()
export class AttendanceService {
  private readonly logger = new Logger(AttendanceService.name);

  constructor(
    @InjectRepository(AttendanceEntity)
    private readonly attendanceRepo: Repository<AttendanceEntity>,
    @InjectRepository(ShelterScheduleEntity)
    private readonly scheduleRepo: Repository<ShelterScheduleEntity>,
    @InjectRepository(TeamEntity)
    private readonly teamRepo: Repository<TeamEntity>,
    @InjectRepository(UserEntity)
    private readonly userRepo: Repository<UserEntity>,
  ) {}

  /**
   * Valida se o evento tem data de reunião ou visita válida
   */
  private validateScheduleDate(schedule: ShelterScheduleEntity): void {
    if (!schedule.meetingDate && !schedule.visitDate) {
      throw new ForbiddenException('Não é possível registrar presença/falta sem data de reunião ou visita válida.');
    }
  }

  /**
   * Líder registra presença/falta em lote (pagela) para todos os membros da equipe
   */
  async registerTeamAttendance(
    userId: string,
    teamId: string,
    scheduleId: string,
    attendances: Array<{ memberId: string; type: AttendanceType; comment?: string }>,
  ): Promise<AttendanceResponseDto[]> {
    const user = await this.getUserWithMembership(userId);
    await this.assertLeaderAccess(user, teamId);

    // Busca o evento
    const schedule = await this.scheduleRepo.findOne({
      where: { id: scheduleId },
      relations: ['team', 'team.shelter']
    });
    if (!schedule) {
      throw new NotFoundException('Evento não encontrado');
    }

    // Valida data do evento
    this.validateScheduleDate(schedule);

    // Verifica se o evento pertence ao time
    if (schedule.team.id !== teamId) {
      throw new ForbiddenException('Este evento não pertence ao time informado');
    }

    // Busca membros da equipe
    const team = await this.teamRepo.findOne({
      where: { id: teamId },
      relations: ['leaders', 'leaders.user', 'teachers', 'teachers.user']
    });

    if (!team) {
      throw new NotFoundException('Time não encontrado');
    }

    // Apenas professores precisam registrar presença (líderes não)
    const teacherUsers = team.teachers?.map(t => t.user).filter(u => u) ?? [];
    const members = [...teacherUsers];

    // Registra presença/falta para cada membro informado
    const results: AttendanceEntity[] = [];
    for (const att of attendances) {
      const member = members.find(m => m.id === att.memberId);
      if (!member) {
        throw new BadRequestException(`Membro ${att.memberId} não encontrado no time`);
      }

      // Verifica se já existe registro
      const existing = await this.attendanceRepo.findOne({
        where: {
          member: { id: member.id },
          shelterSchedule: { id: schedule.id }
        }
      });

      if (existing) {
        // Atualiza registro existente
        existing.type = att.type;
        existing.comment = att.comment;
        results.push(await this.attendanceRepo.save(existing));
      } else {
        // Cria novo registro
        const attendance = this.attendanceRepo.create({
          member,
          shelterSchedule: schedule,
          type: att.type,
          comment: att.comment,
        });
        results.push(await this.attendanceRepo.save(attendance));
      }
    }

    return results.map(this.mapToResponseDto);
  }

  /**
   * Membro registra sua própria presença/falta
   */
  async registerAttendance(
    memberId: string,
    scheduleId: string,
    type: AttendanceType,
    comment?: string,
  ): Promise<AttendanceResponseDto> {
    // Busca o evento
    const schedule = await this.scheduleRepo.findOne({
      where: { id: scheduleId },
      relations: ['team', 'team.shelter', 'team.leaders', 'team.leaders.user', 'team.teachers', 'team.teachers.user']
    });

    if (!schedule) {
      throw new NotFoundException('Evento não encontrado');
    }

    // Valida data do evento
    this.validateScheduleDate(schedule);

    // Verifica se o membro pertence ao time do evento (apenas professores registram presença)
    const teacherUsers = schedule.team.teachers?.map(t => t.user).filter(u => u) ?? [];
    const members = [...teacherUsers];

    const member = members.find(m => m.id === memberId);
    if (!member) {
      throw new ForbiddenException('Você não pertence ao time deste evento');
    }

    // Verifica se já existe registro
    const existing = await this.attendanceRepo.findOne({
      where: {
        member: { id: memberId },
        shelterSchedule: { id: scheduleId }
      }
    });

    if (existing) {
      // Atualiza registro existente
      existing.type = type;
      existing.comment = comment;
      const updated = await this.attendanceRepo.save(existing);
      return this.mapToResponseDto(updated);
    }

    // Cria novo registro
    const attendance = this.attendanceRepo.create({
      member,
      shelterSchedule: schedule,
      type,
      comment,
    });

    const saved = await this.attendanceRepo.save(attendance);
    return this.mapToResponseDto(saved);
  }

  async findByMemberAndSchedule(memberId: string, scheduleId: string) {
    return this.attendanceRepo.findOne({
      where: { member: { id: memberId }, shelterSchedule: { id: scheduleId } },
    });
  }

  /**
   * Endpoint de pendências para líder
   * Retorna reuniões e visitas já realizadas sem lançamento de presença/falta
   */
  async findPendingsForLeader(userId: string, teamId: string, today: Date): Promise<PendingForLeaderDto[]> {
    if (!userId) {
      this.logger.warn('findPendingsForLeader called without userId (token ausente)');
      throw new ForbiddenException('Usuário não identificado no token');
    }

    const user = await this.getUserWithMembership(userId);
    await this.assertLeaderAccess(user, teamId);

    const todayStr = today.toISOString().slice(0, 10);

    // Busca todos eventos passados do time (verifica tanto meetingDate quanto visitDate)
    const schedules = await this.scheduleRepo
      .createQueryBuilder('schedule')
      .leftJoinAndSelect('schedule.team', 'team')
      .leftJoinAndSelect('team.shelter', 'shelter')
      .where('schedule.team.id = :teamId', { teamId })
      .andWhere(
        '(schedule.visitDate < :today OR schedule.meetingDate < :today)',
        { today: todayStr }
      )
      .getMany();

    // Busca todos membros do time
    const team = await this.teamRepo.findOne({
      where: { id: teamId },
      relations: ['leaders', 'leaders.user', 'teachers', 'teachers.user']
    });

    if (!team) {
      throw new NotFoundException('Time não encontrado');
    }

    // Apenas professores precisam registrar presença (líderes não)
    const teacherUsers = team.teachers?.map(t => t.user).filter(u => u) ?? [];
    const members = [...teacherUsers];

    // Para cada schedule, verifica membros sem attendance
    const pendingSchedules: PendingForLeaderDto[] = [];

    for (const schedule of schedules) {
      const pendingMembers: PendingMemberDto[] = [];

      for (const member of members) {
        const attendance = await this.attendanceRepo.findOne({
          where: {
            member: { id: member.id },
            shelterSchedule: { id: schedule.id }
          }
        });

        if (!attendance) {
          // Todos os membros nesta lista são professores (líderes foram removidos)
          pendingMembers.push({
            memberId: member.id,
            memberName: member.name,
            memberEmail: member.email,
            role: 'teacher'
          });
        }
      }

      // Só adiciona o schedule se houver membros pendentes
      if (pendingMembers.length > 0) {
        pendingSchedules.push({
          scheduleId: schedule.id,
          visitNumber: schedule.visitNumber,
          visitDate: schedule.visitDate,
          meetingDate: schedule.meetingDate,
          lessonContent: schedule.lessonContent,
          observation: schedule.observation,
          meetingRoom: schedule.meetingRoom,
          teamName: schedule.team.description || `Time ${schedule.team.numberTeam}`,
          shelterName: schedule.team.shelter.name,
          totalMembers: members.length,
          pendingMembers
        });
      }
    }

    return pendingSchedules;
  }

  /**
   * Endpoint de pendências para membro
   * Retorna reuniões e visitas já realizadas em que o membro não registrou presença ou ausência
   */
  async findPendingsForMember(memberId: string, today: Date): Promise<PendingForMemberDto[]> {
    if (!memberId) {
      this.logger.warn('findPendingsForMember called without memberId (token ausente)');
      throw new ForbiddenException('Usuário não identificado no token');
    }

    const todayStr = today.toISOString().slice(0, 10);

    // Busca os times do membro
    const user = await this.getUserWithMembership(memberId);

    const teamIds: string[] = [];

    // Adiciona time do teacher
    if (user.teacherProfile?.team) {
      teamIds.push(user.teacherProfile.team.id);
    }

    // Adiciona times do leader
    if (user.leaderProfile?.teams) {
      teamIds.push(...user.leaderProfile.teams.map(t => t.id));
    }

    if (teamIds.length === 0) {
      return [];
    }

    // Busca eventos passados dos times do membro
    const schedules = await this.scheduleRepo
      .createQueryBuilder('schedule')
      .leftJoinAndSelect('schedule.team', 'team')
      .leftJoinAndSelect('team.shelter', 'shelter')
      .where('schedule.team.id IN (:...teamIds)', { teamIds })
      .andWhere(
        '(schedule.visitDate < :today OR schedule.meetingDate < :today)',
        { today: todayStr }
      )
      .getMany();

    // Filtra eventos sem attendance para o membro
    const pendings: PendingForMemberDto[] = [];

    for (const schedule of schedules) {
      const attendance = await this.attendanceRepo.findOne({
        where: {
          member: { id: memberId },
          shelterSchedule: { id: schedule.id }
        }
      });

      if (!attendance) {
        pendings.push({
          scheduleId: schedule.id,
          visitNumber: schedule.visitNumber,
          visitDate: schedule.visitDate,
          meetingDate: schedule.meetingDate,
          lessonContent: schedule.lessonContent,
          observation: schedule.observation,
          meetingRoom: schedule.meetingRoom,
          teamId: schedule.team.id,
          teamNumber: schedule.team.numberTeam,
          teamName: schedule.team.description || `Time ${schedule.team.numberTeam}`,
          shelterName: schedule.team.shelter.name
        });
      }
    }

    return pendings;
  }

  /**
   * Mapeia entidade para DTO de resposta
   */
  private mapToResponseDto(entity: AttendanceEntity): AttendanceResponseDto {
    return {
      id: entity.id,
      type: entity.type,
      comment: entity.comment,
      memberId: entity.member.id,
      memberName: entity.member.name,
      memberEmail: entity.member.email,
      scheduleId: entity.shelterSchedule.id,
      visitNumber: entity.shelterSchedule.visitNumber,
      visitDate: entity.shelterSchedule.visitDate,
      meetingDate: entity.shelterSchedule.meetingDate,
      lessonContent: entity.shelterSchedule.lessonContent,
      observation: entity.shelterSchedule.observation,
      meetingRoom: entity.shelterSchedule.meetingRoom,
      teamName: entity.shelterSchedule.team.description || `Time ${entity.shelterSchedule.team.numberTeam}`,
      shelterName: entity.shelterSchedule.team.shelter.name,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt
    };
  }

  /**
   * Lista membros de um time
   */
  async listTeamMembers(userId: string, teamId: string) {
    if (!userId) {
      this.logger.warn('listTeamMembers called without userId (token ausente)');
      throw new ForbiddenException('Usuário não identificado no token');
    }
    const user = await this.getUserWithMembership(userId);
    await this.assertLeaderAccess(user, teamId);

    const team = await this.teamRepo.findOne({
      where: { id: teamId },
      relations: ['teachers', 'teachers.user', 'shelter']
    });

    if (!team) {
      throw new NotFoundException('Time não encontrado');
    }

    const teachers = team.teachers?.map(t => ({
      id: t.user.id,
      name: t.user.name,
      email: t.user.email,
      role: 'teacher'
    })) ?? [];

    return {
      teamId: team.id,
      teamNumber: team.numberTeam,
      shelterName: team.shelter.name,
      members: [...teachers]
    };
  }

  /**
   * Lista reuniões e visitas de um time (versão legada - manter compatibilidade)
   */
  async listTeamSchedules(userId: string, teamId: string) {
    if (!userId) {
      this.logger.warn('listTeamSchedules called without userId (token ausente)');
      throw new ForbiddenException('Usuário não identificado no token');
    }
    const user = await this.getUserWithMembership(userId);
    await this.assertTeamMembership(user, teamId);

    const schedules = await this.scheduleRepo.find({
      where: { team: { id: teamId } },
      relations: ['team', 'team.shelter'],
      order: { visitDate: 'DESC' }
    });

    return schedules.map(schedule => ({
      id: schedule.id,
      visitNumber: schedule.visitNumber,
      visitDate: schedule.visitDate,
      meetingDate: schedule.meetingDate,
      lessonContent: schedule.lessonContent,
      observation: schedule.observation,
      meetingRoom: schedule.meetingRoom,
      teamId: schedule.team.id,
      teamNumber: schedule.team.numberTeam,
      shelterName: schedule.team.shelter.name
    }));
  }

  /**
   * Lista reuniões e visitas de um time com paginação e filtros
   */
  async listTeamSchedulesPaginated(
    userId: string,
    teamId: string,
    filters: AttendanceFiltersDto
  ): Promise<PaginatedResponseDto<TeamScheduleDto>> {
    if (!userId) {
      this.logger.warn('listTeamSchedulesPaginated called without userId (token ausente)');
      throw new ForbiddenException('Usuário não identificado no token');
    }
    const user = await this.getUserWithMembership(userId);
    await this.assertTeamMembership(user, teamId);

    const { page = 1, limit = 20, startDate, endDate, sortOrder = 'desc', sortBy = 'visitDate' } = filters;

    let query = this.scheduleRepo.createQueryBuilder('schedule')
      .leftJoinAndSelect('schedule.team', 'team')
      .leftJoinAndSelect('team.shelter', 'shelter')
      .where('schedule.team.id = :teamId', { teamId });

    // Aplicar filtros de data
    if (startDate) {
      query = query.andWhere('(schedule.visitDate >= :startDate OR schedule.meetingDate >= :startDate)', { startDate });
    }
    if (endDate) {
      query = query.andWhere('(schedule.visitDate <= :endDate OR schedule.meetingDate <= :endDate)', { endDate });
    }

    // Contagem total
    const total = await query.getCount();

    // Aplicar ordenação e paginação
    const sortField = sortBy === 'visitDate' ? 'schedule.visitDate' : 'schedule.meetingDate';
    query = query.orderBy(sortField, sortOrder.toUpperCase() as 'ASC' | 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const schedules = await query.getMany();

    // Buscar contagem de presença para cada schedule
    const schedulesWithStats = await Promise.all(
      schedules.map(async (schedule) => {
        const team = await this.teamRepo.findOne({
          where: { id: teamId },
          relations: ['leaders', 'leaders.user', 'teachers', 'teachers.user']
        });

        // Apenas professores precisam registrar presença (líderes não)
        const teacherUsers = team?.teachers?.map(t => t.user).filter(u => u) ?? [];
        const totalMembers = teacherUsers.length;

        const attendanceCount = await this.attendanceRepo.count({
          where: { shelterSchedule: { id: schedule.id } }
        });

        return {
          id: schedule.id,
          visitNumber: schedule.visitNumber,
          visitDate: schedule.visitDate,
          meetingDate: schedule.meetingDate,
          lessonContent: schedule.lessonContent,
          observation: schedule.observation,
          meetingRoom: schedule.meetingRoom,
          teamId: schedule.team.id,
          teamNumber: schedule.team.numberTeam,
          teamName: schedule.team.description || `Time ${schedule.team.numberTeam}`,
          shelterName: schedule.team.shelter.name,
          attendanceCount,
          totalMembers
        };
      })
    );

    const totalPages = Math.ceil(total / limit);

    return {
      data: schedulesWithStats,
      meta: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    };
  }

  /**
   * Lista os times (e abrigos) que o líder do token gerencia.
   * Admin recebe a lista completa.
   */
  async listLeaderTeams(userId: string) {
    if (!userId) {
      this.logger.warn('listLeaderTeams called without userId (token ausente)');
      throw new ForbiddenException('Usuário não identificado no token');
    }
    const user = await this.getUserWithMembership(userId);

    if (user.role === UserRole.ADMIN) {
      const teams = await this.teamRepo.find({
        relations: ['shelter'],
        order: { numberTeam: 'ASC' }
      });

      return teams.map(team => ({
        teamId: team.id,
        teamNumber: team.numberTeam,
        shelterId: team.shelter.id,
        shelterName: team.shelter.name,
        description: team.description
      }));
    }

    const leaderTeamIds = await this.getLeaderTeamIds(user.id);

    if (leaderTeamIds.length === 0) {
      return [];
    }

    const leaderTeams = await this.teamRepo.find({
      where: { id: In(leaderTeamIds) },
      relations: ['shelter'],
      order: { numberTeam: 'ASC' }
    });

    return leaderTeams.map(team => ({
      teamId: team.id,
      teamNumber: team.numberTeam,
      shelterId: team.shelter.id,
      shelterName: team.shelter.name,
      description: team.description,
      memberCount: (team.teachers?.length || 0)
    }));
  }

  /**
   * Lista times do líder agrupados por abrigo, incluindo professores.
   * Retorna abrigo -> equipes -> professores (líderes não precisam registrar presença).
   */
  async listLeaderTeamsWithMembers(userId: string) {
    if (!userId) {
      this.logger.warn('listLeaderTeamsWithMembers called without userId (token ausente)');
      throw new ForbiddenException('Usuário não identificado no token');
    }

    const user = await this.getUserWithMembership(userId);
    let teams: TeamEntity[] = [];

    if (user.role === UserRole.ADMIN) {
      teams = await this.teamRepo.find({
        relations: ['shelter', 'teachers', 'teachers.user'],
        order: { numberTeam: 'ASC' }
      });
    } else {
      const leaderTeamIds = await this.getLeaderTeamIds(user.id);
      if (leaderTeamIds.length === 0) {
        return [];
      }
      teams = await this.teamRepo.find({
        where: { id: In(leaderTeamIds) },
        relations: ['shelter', 'teachers', 'teachers.user'],
        order: { numberTeam: 'ASC' }
      });
    }

    const sheltersMap: Record<string, { shelterId: string; shelterName: string; teams: any[] }> = {};

    for (const team of teams) {
      const shelterId = team.shelter.id;
      if (!sheltersMap[shelterId]) {
        sheltersMap[shelterId] = {
          shelterId,
          shelterName: team.shelter.name,
          teams: []
        };
      }

      const teachers = team.teachers?.map(t => ({
        id: t.user.id,
        name: t.user.name,
        email: t.user.email,
        role: 'teacher'
      })) ?? [];

      sheltersMap[shelterId].teams.push({
        teamId: team.id,
        teamNumber: team.numberTeam,
        description: team.description,
        members: [...teachers]
      });
    }

    return Object.values(sheltersMap);
  }

  /**
   * Lista registros de presença com filtros e paginação
   */
  async listAttendanceRecords(
    userId: string,
    filters: AttendanceFiltersDto
  ): Promise<PaginatedResponseDto<any>> {
    if (!userId) {
      this.logger.warn('listAttendanceRecords called without userId (token ausente)');
      throw new ForbiddenException('Usuário não identificado no token');
    }

    const user = await this.getUserWithMembership(userId);

    const { page = 1, limit = 20, startDate, endDate, type, teamId, memberId, sortOrder = 'desc', sortBy = 'createdAt' } = filters;

    let query = this.attendanceRepo.createQueryBuilder('attendance')
      .leftJoinAndSelect('attendance.member', 'member')
      .leftJoinAndSelect('attendance.shelterSchedule', 'schedule')
      .leftJoinAndSelect('schedule.team', 'team')
      .leftJoinAndSelect('team.shelter', 'shelter');

    // Restrições baseadas no papel do usuário
    if (user.role !== 'admin') {
      // Para não-admin, só ver registros dos times que participa
      const teamIds = await this.getUserTeamIds(user);
      if (teamIds.length === 0) {
        return {
          data: [],
          meta: { page, limit, total: 0, totalPages: 0, hasNext: false, hasPrev: false }
        };
      }
      query = query.andWhere('schedule.team.id IN (:...teamIds)', { teamIds });
    }

    // Aplicar filtros
    if (startDate || endDate) {
      if (startDate) {
        query = query.andWhere('(schedule.visitDate >= :startDate OR schedule.meetingDate >= :startDate)', { startDate });
      }
      if (endDate) {
        query = query.andWhere('(schedule.visitDate <= :endDate OR schedule.meetingDate <= :endDate)', { endDate });
      }
    }

    if (type) {
      query = query.andWhere('attendance.type = :type', { type });
    }

    if (teamId) {
      query = query.andWhere('schedule.team.id = :teamId', { teamId });
    }

    if (memberId) {
      query = query.andWhere('attendance.member.id = :memberId', { memberId });
    }

    // Contagem total
    const total = await query.getCount();

    // Ordenação e paginação
    const sortField = sortBy === 'createdAt' ? 'attendance.createdAt' :
                     sortBy === 'visitDate' ? 'schedule.visitDate' : 'schedule.meetingDate';

    query = query.orderBy(sortField, sortOrder.toUpperCase() as 'ASC' | 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const attendances = await query.getMany();

    const data = attendances.map(attendance => ({
      id: attendance.id,
      type: attendance.type,
      comment: attendance.comment,
      memberId: attendance.member.id,
      memberName: attendance.member.name,
      memberEmail: attendance.member.email,
      scheduleId: attendance.shelterSchedule.id,
      visitNumber: attendance.shelterSchedule.visitNumber,
      visitDate: attendance.shelterSchedule.visitDate,
      meetingDate: attendance.shelterSchedule.meetingDate,
      lessonContent: attendance.shelterSchedule.lessonContent,
      observation: attendance.shelterSchedule.observation,
      meetingRoom: attendance.shelterSchedule.meetingRoom,
      teamName: attendance.shelterSchedule.team.description || `Time ${attendance.shelterSchedule.team.numberTeam}`,
      shelterName: attendance.shelterSchedule.team.shelter.name,
      createdAt: attendance.createdAt,
      updatedAt: attendance.updatedAt
    }));

    const totalPages = Math.ceil(total / limit);

    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    };
  }

  /**
   * Estatísticas de presença do usuário
   */
  async getAttendanceStats(
    userId: string,
    teamId?: string,
    startDate?: string,
    endDate?: string
  ): Promise<AttendanceStatsDto> {
    if (!userId) {
      throw new ForbiddenException('Usuário não identificado no token');
    }

    const user = await this.getUserWithMembership(userId);

    let query = this.attendanceRepo.createQueryBuilder('attendance')
      .leftJoin('attendance.member', 'member')
      .leftJoin('attendance.shelterSchedule', 'schedule')
      .leftJoin('schedule.team', 'team')
      .where('attendance.member.id = :userId', { userId });

    // Aplicar filtros
    if (teamId) {
      query = query.andWhere('schedule.team.id = :teamId', { teamId });
    }

    if (startDate || endDate) {
      if (startDate) {
        query = query.andWhere('(schedule.visitDate >= :startDate OR schedule.meetingDate >= :startDate)', { startDate });
      }
      if (endDate) {
        query = query.andWhere('(schedule.visitDate <= :endDate OR schedule.meetingDate <= :endDate)', { endDate });
      }
    }

    const records = await query.select([
      'attendance.type',
      'schedule.id'
    ]).getRawMany();

    const totalAttendanceRecords = records.length;
    const presentCount = records.filter(r => r.attendance_type === 'present').length;
    const absentCount = records.filter(r => r.attendance_type === 'absent').length;

    // Buscar eventos únicos que o usuário participou
    const uniqueSchedules = [...new Set(records.map(r => r.schedule_id))];
    const totalEvents = uniqueSchedules.length;

    // Calcular pendências (eventos passados sem registro)
    let pendingQuery = this.scheduleRepo.createQueryBuilder('schedule')
      .leftJoin('schedule.team', 'team')
      .leftJoin('team.leaders', 'leader', 'leader.user.id = :userId', { userId })
      .leftJoin('team.teachers', 'teacher', 'teacher.user.id = :userId', { userId })
      .where('(leader.user.id = :userId OR teacher.user.id = :userId)', { userId })
      .andWhere('(schedule.visitDate < :today OR schedule.meetingDate < :today)', { today: new Date().toISOString().slice(0, 10) });

    if (teamId) {
      pendingQuery = pendingQuery.andWhere('schedule.team.id = :teamId', { teamId });
    }

    if (startDate || endDate) {
      if (startDate) {
        pendingQuery = pendingQuery.andWhere('(schedule.visitDate >= :startDate OR schedule.meetingDate >= :startDate)', { startDate });
      }
      if (endDate) {
        pendingQuery = pendingQuery.andWhere('(schedule.visitDate <= :endDate OR schedule.meetingDate <= :endDate)', { endDate });
      }
    }

    const pendingSchedules = await pendingQuery.getMany();
    const pendingCount = pendingSchedules.length - totalAttendanceRecords;

    return {
      totalEvents,
      totalAttendanceRecords,
      presentCount,
      absentCount,
      attendanceRate: totalAttendanceRecords > 0 ? Math.round((presentCount / totalAttendanceRecords) * 100) : 0,
      pendingCount: Math.max(0, pendingCount)
    };
  }

  /**
   * Estatísticas de presença por time (para líderes)
   */
  async getTeamAttendanceStats(
    userId: string,
    teamId: string,
    startDate?: string,
    endDate?: string
  ): Promise<AttendanceStatsDto> {
    if (!userId) {
      throw new ForbiddenException('Usuário não identificado no token');
    }

    const user = await this.getUserWithMembership(userId);
    await this.assertLeaderAccess(user, teamId);

    // Buscar todos os professores do time
    const team = await this.teamRepo.findOne({
      where: { id: teamId },
      relations: ['teachers', 'teachers.user']
    });

    if (!team) {
      throw new NotFoundException('Time não encontrado');
    }

    // Apenas professores precisam registrar presença (líderes não)
    const teacherUsers = team.teachers?.map(t => t.user).filter(u => u) ?? [];
    const members = [...teacherUsers];
    const memberIds = members.map(m => m.id);

    let query = this.attendanceRepo.createQueryBuilder('attendance')
      .leftJoin('attendance.shelterSchedule', 'schedule')
      .where('attendance.member.id IN (:...memberIds)', { memberIds })
      .andWhere('schedule.team.id = :teamId', { teamId });

    // Aplicar filtros de data
    if (startDate || endDate) {
      if (startDate) {
        query = query.andWhere('(schedule.visitDate >= :startDate OR schedule.meetingDate >= :startDate)', { startDate });
      }
      if (endDate) {
        query = query.andWhere('(schedule.visitDate <= :endDate OR schedule.meetingDate <= :endDate)', { endDate });
      }
    }

    const records = await query.select([
      'attendance.type',
      'schedule.id'
    ]).getRawMany();

    const totalAttendanceRecords = records.length;
    const presentCount = records.filter(r => r.attendance_type === 'present').length;
    const absentCount = records.filter(r => r.attendance_type === 'absent').length;

    // Buscar eventos únicos do time
    let eventsQuery = this.scheduleRepo.createQueryBuilder('schedule')
      .where('schedule.team.id = :teamId', { teamId });

    if (startDate || endDate) {
      if (startDate) {
        eventsQuery = eventsQuery.andWhere('(schedule.visitDate >= :startDate OR schedule.meetingDate >= :startDate)', { startDate });
      }
      if (endDate) {
        eventsQuery = eventsQuery.andWhere('(schedule.visitDate <= :endDate OR schedule.meetingDate <= :endDate)', { endDate });
      }
    }

    const totalEvents = await eventsQuery.getCount();
    const expectedRecords = totalEvents * members.length;

    return {
      totalEvents,
      totalAttendanceRecords,
      presentCount,
      absentCount,
      attendanceRate: expectedRecords > 0 ? Math.round((totalAttendanceRecords / expectedRecords) * 100) : 0,
      pendingCount: Math.max(0, expectedRecords - totalAttendanceRecords)
    };
  }

  /**
   * Método auxiliar para obter IDs dos times do usuário
   */
  private async getUserTeamIds(user: any): Promise<string[]> {
    const teamIds: string[] = [];

    // Adicionar times do teacher
    if (user.teacherProfile?.team) {
      teamIds.push(user.teacherProfile.team.id);
    }

    // Adicionar times do leader
    if (user.leaderProfile?.teams) {
      teamIds.push(...user.leaderProfile.teams.map((t: any) => t.id));
    }

    return teamIds;
  }

  private async getUserWithMembership(userId: string): Promise<UserEntity> {
    if (!userId) {
      this.logger.warn('getUserWithMembership called with undefined userId');
      throw new ForbiddenException('Usuário não identificado no token');
    }

    const user = await this.userRepo.findOne({
      where: { id: userId },
      relations: [
        'leaderProfile',
        'leaderProfile.teams',
        'leaderProfile.teams.shelter',
        'teacherProfile',
        'teacherProfile.team',
        'teacherProfile.team.shelter'
      ]
    });

    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    return user;
  }

  private async getLeaderTeamIds(userId: string): Promise<string[]> {
    const rows = await this.teamRepo.createQueryBuilder('team')
      .leftJoin('team.leaders', 'leaderProfile')
      .leftJoin('leaderProfile.user', 'leaderUser')
      .where('leaderUser.id = :userId', { userId })
      .select('team.id', 'teamId')
      .getRawMany();

    return rows.map(r => r.teamId);
  }

  private async getTeacherTeamIds(userId: string): Promise<string[]> {
    const rows = await this.teamRepo.createQueryBuilder('team')
      .leftJoin('team.teachers', 'teacherProfile')
      .leftJoin('teacherProfile.user', 'teacherUser')
      .where('teacherUser.id = :userId', { userId })
      .select('team.id', 'teamId')
      .getRawMany();

    return rows.map(r => r.teamId);
  }

  private async assertLeaderAccess(user: UserEntity, teamId: string) {
    if (user.role === UserRole.ADMIN) {
      return;
    }

    const leaderTeamIds = await this.getLeaderTeamIds(user.id);
    const isLeaderOfTeam = leaderTeamIds.includes(teamId);

    if (!isLeaderOfTeam) {
      throw new ForbiddenException('Você não é líder deste time');
    }
  }

  private async assertTeamMembership(user: UserEntity, teamId: string) {
    if (user.role === UserRole.ADMIN) {
      return;
    }

    const [leaderTeamIds, teacherTeamIds] = await Promise.all([
      this.getLeaderTeamIds(user.id),
      this.getTeacherTeamIds(user.id),
    ]);

    const isMember = leaderTeamIds.includes(teamId) || teacherTeamIds.includes(teamId);

    if (!isMember) {
      throw new ForbiddenException('Você não pertence a este time');
    }
  }

  /**
   * Lista pagelas hierarquicamente: abrigos -> equipes -> agendamentos
   * Mostra todos os registros de presença organizados por abrigo, equipe e agendamento
   */
  async listAttendanceSheetsHierarchical(userId: string, filters?: { startDate?: string; endDate?: string }): Promise<ShelterWithTeamsDto[]> {
    if (!userId) {
      this.logger.warn('listAttendanceSheetsHierarchical called without userId (token ausente)');
      throw new ForbiddenException('Usuário não identificado no token');
    }

    const user = await this.getUserWithMembership(userId);

    // Buscar IDs dos times que o usuário gerencia (como líder)
    const teamIds = user.role === UserRole.ADMIN
      ? [] // Admin vê todos, então não filtra
      : await this.getLeaderTeamIds(user.id);

    // Query para buscar abrigos com equipes e agendamentos
    let sheltersQuery = this.teamRepo.createQueryBuilder('team')
      .leftJoinAndSelect('team.shelter', 'shelter')
      .leftJoinAndSelect('team.teachers', 'teachers')
      .leftJoinAndSelect('teachers.user', 'teacherUser');

    if (teamIds.length > 0) {
      sheltersQuery = sheltersQuery.where('team.id IN (:...teamIds)', { teamIds });
    }

    const teams = await sheltersQuery.getMany();

    // Agrupar por abrigo
    const sheltersMap: Record<string, any> = {};

    for (const team of teams) {
      const shelterId = team.shelter.id;
      if (!sheltersMap[shelterId]) {
        sheltersMap[shelterId] = {
          shelterId,
          shelterName: team.shelter.name,
          totalTeams: 0,
          teams: []
        };
      }
      sheltersMap[shelterId].totalTeams++;
    }

    // Para cada abrigo, buscar agendamentos e registros de presença
    const result: ShelterWithTeamsDto[] = [];

    for (const shelterData of Object.values(sheltersMap) as any[]) {
      const shelterTeams = teams.filter(team => team.shelter.id === shelterData.shelterId);

      const teamsWithSchedules: TeamWithSchedulesDto[] = [];

      for (const team of shelterTeams) {
        // Buscar agendamentos do time
        let schedulesQuery = this.scheduleRepo.createQueryBuilder('schedule')
          .where('schedule.team.id = :teamId', { teamId: team.id })
          .leftJoinAndSelect('schedule.team', 'team')
          .leftJoinAndSelect('team.shelter', 'shelter')
          .orderBy('schedule.visitDate', 'DESC');

        // Aplicar filtros de data se fornecidos
        if (filters?.startDate) {
          schedulesQuery = schedulesQuery.andWhere('(schedule.visitDate >= :startDate OR schedule.meetingDate >= :startDate)', { startDate: filters.startDate });
        }
        if (filters?.endDate) {
          schedulesQuery = schedulesQuery.andWhere('(schedule.visitDate <= :endDate OR schedule.meetingDate <= :endDate)', { endDate: filters.endDate });
        }

        const schedules = await schedulesQuery.getMany();

        const schedulesWithAttendance: ScheduleWithAttendanceDto[] = [];

        for (const schedule of schedules) {
          // Contar professores do time
          const teacherCount = team.teachers?.length || 0;

          // Buscar registros de presença para este agendamento
          const attendances = await this.attendanceRepo.find({
            where: { shelterSchedule: { id: schedule.id } },
            relations: ['member']
          });

          // Calcular estatísticas
          const presentCount = attendances.filter(a => a.type === AttendanceType.PRESENT).length;
          const absentCount = attendances.filter(a => a.type === AttendanceType.ABSENT).length;
          const pendingCount = Math.max(0, teacherCount - attendances.length);

          // Mapear registros para DTO
          const attendanceRecords: AttendanceRecordDto[] = attendances.map(attendance => ({
            id: attendance.id,
            type: attendance.type,
            comment: attendance.comment,
            memberId: attendance.member.id,
            memberName: attendance.member.name,
            memberEmail: attendance.member.email,
            createdAt: attendance.createdAt,
            updatedAt: attendance.updatedAt
          }));

          schedulesWithAttendance.push({
            scheduleId: schedule.id,
            visitNumber: schedule.visitNumber,
            visitDate: schedule.visitDate,
            meetingDate: schedule.meetingDate,
            lessonContent: schedule.lessonContent,
            observation: schedule.observation,
            meetingRoom: schedule.meetingRoom,
            totalTeachers: teacherCount,
            presentCount,
            absentCount,
            pendingCount,
            attendanceRecords
          });
        }

        teamsWithSchedules.push({
          teamId: team.id,
          teamNumber: team.numberTeam,
          teamName: team.description || `Time ${team.numberTeam}`,
          description: team.description,
          totalSchedules: schedules.length,
          schedules: schedulesWithAttendance
        });
      }

      result.push({
        shelterId: shelterData.shelterId,
        shelterName: shelterData.shelterName,
        totalTeams: shelterData.totalTeams,
        teams: teamsWithSchedules
      });
    }

    return result;
  }
}
