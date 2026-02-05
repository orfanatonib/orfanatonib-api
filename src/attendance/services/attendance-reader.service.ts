import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { AttendanceEntity, AttendanceCategory, AttendanceType } from '../entities/attendance.entity';
import { ShelterScheduleEntity } from 'src/shelter/schedule/entities/shelter-schedule.entity';
import { TeamEntity } from 'src/shelter/team/entities/team.entity';
import { VisitReportEntity } from 'src/shelter/visit-report/entities/visit-report.entity';
import { UserRole } from 'src/core/auth/auth.types';
import { AttendanceAccessService } from './attendance-access.service';
import {
    AttendanceFiltersDto,
    PendingForLeaderDto,
    PendingMemberDto,
    PendingForMemberDto,
    TeamScheduleDto,
    PaginatedResponseDto,
    AttendanceStatsDto,
    ShelterWithTeamsDto,
    TeamWithSchedulesDto,
    ScheduleWithAttendanceDto,
    AttendanceRecordDto,
    AllPendingsResponseDto,
    TeamPendingsDto,
    VisitReportPendingDto,
    TeamVisitReportPendingsDto
} from '../dto/attendance-response.dto';

@Injectable()
export class AttendanceReaderService {

    constructor(
        @InjectRepository(AttendanceEntity)
        private readonly attendanceRepo: Repository<AttendanceEntity>,
        @InjectRepository(ShelterScheduleEntity)
        private readonly scheduleRepo: Repository<ShelterScheduleEntity>,
        @InjectRepository(TeamEntity)
        private readonly teamRepo: Repository<TeamEntity>,
        @InjectRepository(VisitReportEntity)
        private readonly visitReportRepo: Repository<VisitReportEntity>,
        private readonly accessService: AttendanceAccessService,
    ) { }

    async findAllPendings(userId: string, today: Date): Promise<AllPendingsResponseDto> {
        if (!userId) {
            throw new ForbiddenException('Usuário não identificado no token');
        }

        const user = await this.accessService.getUserWithMembership(userId);

        const leaderPendings: TeamPendingsDto[] = [];
        const memberPendings: PendingForMemberDto[] = [];

        // === LEADER PENDINGS (Admin vê todas, Líder vê suas equipes) ===
        const leaderTeamIds = user.role === UserRole.ADMIN
            ? []
            : await this.accessService.getLeaderTeamIds(user.id);

        let leaderTeams: TeamEntity[] = [];

        if (user.role === UserRole.ADMIN) {
            leaderTeams = await this.teamRepo.find({
                relations: ['members', 'members.user', 'shelter'],
                order: { numberTeam: 'ASC' }
            });
        } else if (leaderTeamIds.length > 0) {
            leaderTeams = await this.teamRepo.find({
                where: { id: In(leaderTeamIds) },
                relations: ['members', 'members.user', 'shelter'],
                order: { numberTeam: 'ASC' }
            });
        }

        for (const team of leaderTeams) {
            const schedules = await this.scheduleRepo.createQueryBuilder('schedule')
                .leftJoinAndSelect('schedule.team', 'scheduleTeam')
                .where('schedule.team.id = :teamId', { teamId: team.id })
                .andWhere('(schedule.visitDate < :today OR schedule.meetingDate < :today)', { today: today.toISOString().slice(0, 10) })
                .orderBy('COALESCE(schedule.visitDate, schedule.meetingDate)', 'DESC')
                .getMany();

            const pendings: PendingForLeaderDto[] = [];
            const memberUsers = team.members?.map(t => t.user).filter(u => u) ?? [];

            for (const schedule of schedules) {
                if (schedule.visitDate && new Date(schedule.visitDate) < today) {
                    const attendances = await this.attendanceRepo.find({
                        where: {
                            shelterSchedule: { id: schedule.id },
                            category: AttendanceCategory.VISIT
                        },
                        relations: ['member']
                    });

                    const missingMembers: PendingMemberDto[] = [];

                    for (const member of memberUsers) {
                        const hasAttendance = attendances.some(a => a.member.id === member.id);
                        if (!hasAttendance) {
                            missingMembers.push({
                                memberId: member.id,
                                memberName: member.name,
                                memberEmail: member.email,
                                role: 'member'
                            });
                        }
                    }

                    if (missingMembers.length > 0) {
                        pendings.push({
                            scheduleId: schedule.id,
                            category: AttendanceCategory.VISIT,
                            date: schedule.visitDate,
                            location: `Abrigo - ${team.shelter.name}`,
                            visitNumber: schedule.visitNumber,
                            lessonContent: schedule.lessonContent,
                            pendingMembers: missingMembers,
                            teamName: team.description || `Equipe ${team.numberTeam}`,
                            shelterName: team.shelter.name,
                            totalMembers: memberUsers.length
                        });
                    }
                }

                if (schedule.meetingDate && new Date(schedule.meetingDate) < today) {
                    const attendances = await this.attendanceRepo.find({
                        where: {
                            shelterSchedule: { id: schedule.id },
                            category: AttendanceCategory.MEETING
                        },
                        relations: ['member']
                    });

                    const missingMembers: PendingMemberDto[] = [];

                    for (const member of memberUsers) {
                        const hasAttendance = attendances.some(a => a.member.id === member.id);
                        if (!hasAttendance) {
                            missingMembers.push({
                                memberId: member.id,
                                memberName: member.name,
                                memberEmail: member.email,
                                role: 'member'
                            });
                        }
                    }

                    if (missingMembers.length > 0) {
                        pendings.push({
                            scheduleId: schedule.id,
                            category: AttendanceCategory.MEETING,
                            date: schedule.meetingDate,
                            location: `NIB - ${schedule.meetingRoom || 'Sem local'}`,
                            visitNumber: schedule.visitNumber,
                            lessonContent: schedule.lessonContent,
                            pendingMembers: missingMembers,
                            teamName: team.description || `Equipe ${team.numberTeam}`,
                            shelterName: team.shelter.name,
                            totalMembers: memberUsers.length
                        });
                    }
                }
            }

            if (pendings.length > 0) {
                leaderPendings.push({
                    teamId: team.id,
                    teamName: team.description || `Equipe ${team.numberTeam}`,
                    shelterName: team.shelter.name,
                    pendings
                });
            }
        }

        // === MEMBER PENDINGS (pendências pessoais do usuário) ===
        // Admin não tem pendências pessoais de membro
        if (user.role !== UserRole.ADMIN) {
            const memberTeams = await this.teamRepo.createQueryBuilder('team')
                .leftJoin('team.members', 'member')
                .leftJoin('member.user', 'memberUser')
                .leftJoinAndSelect('team.shelter', 'shelter')
                .where('memberUser.id = :userId', { userId })
                .getMany();

            if (memberTeams.length > 0) {
                const memberTeamIds = memberTeams.map(t => t.id);

                const memberSchedules = await this.scheduleRepo.createQueryBuilder('schedule')
                    .leftJoinAndSelect('schedule.team', 'team')
                    .where('schedule.team.id IN (:...memberTeamIds)', { memberTeamIds })
                    .andWhere('(schedule.visitDate < :today OR schedule.meetingDate < :today)', { today: today.toISOString().slice(0, 10) })
                    .orderBy('COALESCE(schedule.visitDate, schedule.meetingDate)', 'DESC')
                    .getMany();

                for (const schedule of memberSchedules) {
                    const team = memberTeams.find(t => t.id === schedule.team.id);

                    if (schedule.visitDate && new Date(schedule.visitDate) < today) {
                        const attendance = await this.attendanceRepo.findOne({
                            where: {
                                shelterSchedule: { id: schedule.id },
                                member: { id: userId },
                                category: AttendanceCategory.VISIT
                            }
                        });

                        // Incluir se não houver registro (não lançada pelo líder)
                        if (!attendance) {
                            memberPendings.push({
                                scheduleId: schedule.id,
                                category: AttendanceCategory.VISIT,
                                date: schedule.visitDate,
                                location: `Abrigo - ${team?.shelter?.name || 'Local desconhecido'}`,
                                visitNumber: schedule.visitNumber,
                                teamNumber: schedule.team.numberTeam,
                                shelterName: team?.shelter?.name || '',
                                teamName: team?.description || `Equipe ${team?.numberTeam}`,
                                lessonContent: schedule.lessonContent || '',
                                teamId: schedule.team.id
                            });
                        }
                    }

                    if (schedule.meetingDate && new Date(schedule.meetingDate) < today) {
                        const attendance = await this.attendanceRepo.findOne({
                            where: {
                                shelterSchedule: { id: schedule.id },
                                member: { id: userId },
                                category: AttendanceCategory.MEETING
                            }
                        });

                        // Incluir se não houver registro (não lançada pelo líder)
                        if (!attendance) {
                            memberPendings.push({
                                scheduleId: schedule.id,
                                category: AttendanceCategory.MEETING,
                                date: schedule.meetingDate,
                                location: `NIB - ${schedule.meetingRoom || 'Sem local'}`,
                                visitNumber: schedule.visitNumber,
                                teamNumber: schedule.team.numberTeam,
                                shelterName: team?.shelter?.name || '',
                                teamName: team?.description || `Equipe ${team?.numberTeam}`,
                                lessonContent: schedule.lessonContent || '',
                                teamId: schedule.team.id
                            });
                        }
                    }
                }
            }
        }

        // === VISIT REPORT PENDINGS (visitas passadas sem relatório) ===
        const visitReportPendings: TeamVisitReportPendingsDto[] = [];

        // Reutiliza os mesmos times já carregados para leader
        for (const team of leaderTeams) {
            const schedulesWithPastVisits = await this.scheduleRepo.createQueryBuilder('schedule')
                .leftJoinAndSelect('schedule.team', 'scheduleTeam')
                .leftJoinAndSelect('scheduleTeam.shelter', 'shelter')
                .leftJoinAndSelect('shelter.address', 'address')
                .where('schedule.team.id = :teamId', { teamId: team.id })
                .andWhere('schedule.visitDate IS NOT NULL')
                .andWhere('schedule.visitDate < :today', { today: today.toISOString().slice(0, 10) })
                .orderBy('schedule.visitDate', 'DESC')
                .getMany();

            const pendingReports: VisitReportPendingDto[] = [];

            for (const schedule of schedulesWithPastVisits) {
                // Verifica se já existe relatório para este agendamento
                const existingReport = await this.visitReportRepo.findOne({
                    where: { schedule: { id: schedule.id } }
                });

                if (!existingReport) {
                    const shelterAddress = schedule.team?.shelter?.address;
                    const addressStr = shelterAddress
                        ? `${shelterAddress.street || ''}, ${shelterAddress.number || ''} - ${shelterAddress.district || ''}, ${shelterAddress.city || ''}`
                        : undefined;

                    // Formata a data para exibição (DD/MM/YYYY)
                    const dateObj = new Date(schedule.visitDate!);
                    const visitDateFormatted = dateObj.toLocaleDateString('pt-BR', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric'
                    });

                    // Cria um resumo amigável
                    const summary = `Rodada ${schedule.visitNumber} • ${visitDateFormatted} • ${schedule.lessonContent || 'Sem lição definida'}`;

                    pendingReports.push({
                        scheduleId: schedule.id,
                        visitNumber: schedule.visitNumber,
                        visitDate: schedule.visitDate!,
                        visitDateFormatted,
                        summary,
                        lessonContent: schedule.lessonContent,
                        observation: schedule.observation,
                        teamId: team.id,
                        teamNumber: team.numberTeam,
                        teamName: team.description || `Equipe ${team.numberTeam}`,
                        shelterName: team.shelter.name,
                        shelterAddress: addressStr
                    });
                }
            }

            if (pendingReports.length > 0) {
                visitReportPendings.push({
                    teamId: team.id,
                    teamName: team.description || `Equipe ${team.numberTeam}`,
                    shelterName: team.shelter.name,
                    pendings: pendingReports
                });
            }
        }

        return { leaderPendings, memberPendings, visitReportPendings };
    }

    async listTeamMembers(userId: string, teamId: string) {
        if (!userId) {
            throw new ForbiddenException('Usuário não identificado no token');
        }
        const user = await this.accessService.getUserWithMembership(userId);
        await this.accessService.assertLeaderAccess(user, teamId);

        const team = await this.teamRepo.findOne({
            where: { id: teamId },
            relations: ['members', 'members.user', 'shelter']
        });

        if (!team) {
            throw new NotFoundException('Time não encontrado');
        }

        const members = team.members?.map(t => ({
            id: t.user.id,
            name: t.user.name,
            email: t.user.email,
            role: 'member' as 'member'
        })) ?? [];

        return {
            teamId: team.id,
            teamNumber: team.numberTeam,
            shelterName: team.shelter.name,
            members: [...members]
        };
    }

    async listTeamSchedulesFull(
        userId: string,
        teamId: string,
        filters: AttendanceFiltersDto
    ): Promise<TeamScheduleDto[]> {
        if (!userId) {
            throw new ForbiddenException('Usuário não identificado no token');
        }
        const user = await this.accessService.getUserWithMembership(userId);
        await this.accessService.assertTeamMembership(user, teamId);

        const { startDate, endDate, sortOrder = 'desc', sortBy = 'visitDate' } = filters;

        let query = this.scheduleRepo.createQueryBuilder('schedule')
            .leftJoinAndSelect('schedule.team', 'team')
            .leftJoinAndSelect('team.shelter', 'shelter')
            .where('schedule.team.id = :teamId', { teamId });

        if (startDate) {
            query = query.andWhere('(schedule.visitDate >= :startDate OR schedule.meetingDate >= :startDate)', { startDate });
        }
        if (endDate) {
            query = query.andWhere('(schedule.visitDate <= :endDate OR schedule.meetingDate <= :endDate)', { endDate });
        }

        if (sortBy === 'visitDate' || sortBy === 'meetingDate') {
            query = query.orderBy('COALESCE(schedule.visitDate, schedule.meetingDate)', sortOrder.toUpperCase() as 'ASC' | 'DESC');
        } else {
            query = query.orderBy('schedule.visitDate', sortOrder.toUpperCase() as 'ASC' | 'DESC');
        }

        const schedules = await query.getMany();
        const flatSchedules: TeamScheduleDto[] = [];

        const team = await this.teamRepo.findOne({
            where: { id: teamId },
            relations: ['members', 'members.user', 'shelter']
        });

        const memberUsers = team?.members?.map(t => t.user).filter(u => u) ?? [];
        const totalMembers = memberUsers.length;

        for (const schedule of schedules) {
            const allAttendances = await this.attendanceRepo.find({
                where: { shelterSchedule: { id: schedule.id } }
            });

            if (schedule.visitDate) {
                const visitAttendances = allAttendances.filter(a => a.category === AttendanceCategory.VISIT);
                flatSchedules.push({
                    id: schedule.id,
                    category: AttendanceCategory.VISIT,
                    date: schedule.visitDate,
                    visitNumber: schedule.visitNumber,
                    lessonContent: schedule.lessonContent,
                    observation: schedule.observation,
                    location: `Abrigo - ${team?.shelter?.name || 'Local desconhecido'}`,
                    teamId: schedule.team.id,
                    teamNumber: schedule.team.numberTeam,
                    teamName: schedule.team.description || `Equipe ${schedule.team.numberTeam}`,
                    shelterName: schedule.team.shelter.name,
                    attendanceCount: visitAttendances.length,
                    totalMembers
                });
            }

            if (schedule.meetingDate) {
                const meetingAttendances = allAttendances.filter(a => a.category === AttendanceCategory.MEETING);
                flatSchedules.push({
                    id: schedule.id,
                    category: AttendanceCategory.MEETING,
                    date: schedule.meetingDate,
                    visitNumber: schedule.visitNumber,
                    lessonContent: schedule.lessonContent,
                    observation: schedule.observation,
                    location: `NIB - ${schedule.meetingRoom || 'Sem local'}`,
                    teamId: schedule.team.id,
                    teamNumber: schedule.team.numberTeam,
                    teamName: schedule.team.description || `Equipe ${schedule.team.numberTeam}`,
                    shelterName: schedule.team.shelter.name,
                    attendanceCount: meetingAttendances.length,
                    totalMembers
                });
            }
        }

        return flatSchedules.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }

    async listLeaderTeams(userId: string) {
        if (!userId) {
            throw new ForbiddenException('Usuário não identificado no token');
        }
        const user = await this.accessService.getUserWithMembership(userId);

        if (user.role === UserRole.ADMIN) {
            const teams = await this.teamRepo.find({
                relations: ['shelter', 'members'],
                order: { numberTeam: 'ASC' }
            });

            return teams.map(team => ({
                teamId: team.id,
                teamNumber: team.numberTeam,
                shelterId: team.shelter.id,
                shelterName: team.shelter.name,
                description: team.description,
                memberCount: team.members?.length || 0
            }));
        }

        const leaderTeamIds = await this.accessService.getLeaderTeamIds(user.id);

        if (leaderTeamIds.length === 0) {
            return [];
        }

        const leaderTeams = await this.teamRepo.find({
            where: { id: In(leaderTeamIds) },
            relations: ['shelter', 'members'],
            order: { numberTeam: 'ASC' }
        });

        return leaderTeams.map(team => ({
            teamId: team.id,
            teamNumber: team.numberTeam,
            shelterId: team.shelter.id,
            shelterName: team.shelter.name,
            description: team.description,
            memberCount: (team.members?.length || 0)
        }));
    }

    async listLeaderTeamsWithMembers(userId: string) {
        if (!userId) {
            throw new ForbiddenException('Usuário não identificado no token');
        }

        const user = await this.accessService.getUserWithMembership(userId);
        let teams: TeamEntity[] = [];

        if (user.role === UserRole.ADMIN) {
            teams = await this.teamRepo.find({
                relations: ['shelter', 'members', 'members.user'],
                order: { numberTeam: 'ASC' }
            });
        } else {
            const leaderTeamIds = await this.accessService.getLeaderTeamIds(user.id);
            if (leaderTeamIds.length === 0) {
                return [];
            }
            teams = await this.teamRepo.find({
                where: { id: In(leaderTeamIds) },
                relations: ['shelter', 'members', 'members.user'],
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

            const members = team.members?.map(t => ({
                id: t.user.id,
                name: t.user.name,
                email: t.user.email,
                role: 'member'
            })) ?? [];

            sheltersMap[shelterId].teams.push({
                teamId: team.id,
                teamNumber: team.numberTeam,
                description: team.description,
                members: [...members]
            });
        }

        return Object.values(sheltersMap);
    }

    async listAttendanceRecords(
        userId: string,
        filters: AttendanceFiltersDto
    ): Promise<PaginatedResponseDto<AttendanceRecordDto>> {
        if (!userId) {
            throw new ForbiddenException('Usuário não identificado no token');
        }

        const user = await this.accessService.getUserWithMembership(userId);

        const { page = 1, limit = 20, startDate, endDate, type, category, teamId, memberId, scheduleId, memberName, sortOrder = 'desc', sortBy = 'createdAt' } = filters;

        let query = this.attendanceRepo.createQueryBuilder('attendance')
            .leftJoinAndSelect('attendance.member', 'member')
            .leftJoinAndSelect('attendance.shelterSchedule', 'schedule')
            .leftJoinAndSelect('schedule.team', 'team')
            .leftJoinAndSelect('team.shelter', 'shelter');

        if (user.role !== 'admin') {
            const teamIds = await this.accessService.getUserTeamIds(user);
            if (teamIds.length === 0) {
                return {
                    data: [],
                    meta: { page, limit, total: 0, totalPages: 0, hasNext: false, hasPrev: false }
                };
            }
            query = query.andWhere('schedule.team.id IN (:...teamIds)', { teamIds });
        }

        if (category) {
            query = query.andWhere('attendance.category = :category', { category });
        }

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

        if (scheduleId) {
            query = query.andWhere('schedule.id = :scheduleId', { scheduleId });
        }

        if (memberName) {
            query = query.andWhere('member.name LIKE :memberName', { memberName: `%${memberName}%` });
        }

        const total = await query.getCount();

        const sortField = sortBy === 'createdAt' ? 'attendance.createdAt' :
            sortBy === 'visitDate' ? 'schedule.visitDate' : 'schedule.meetingDate';

        query = query.orderBy(sortField, sortOrder.toUpperCase() as 'ASC' | 'DESC')
            .skip((page - 1) * limit)
            .take(limit);

        const attendances = await query.getMany();

        const data = attendances.map(attendance => ({
            id: attendance.id,
            type: attendance.type,
            category: attendance.category,
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
            teamName: attendance.shelterSchedule.team.description || `Equipe ${attendance.shelterSchedule.team.numberTeam}`,
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

    async getAttendanceStats(
        userId: string,
        teamId?: string,
        startDate?: string,
        endDate?: string
    ): Promise<AttendanceStatsDto> {
        if (!userId) {
            throw new ForbiddenException('Usuário não identificado no token');
        }

        const user = await this.accessService.getUserWithMembership(userId);

        let query = this.attendanceRepo.createQueryBuilder('attendance')
            .leftJoin('attendance.member', 'member')
            .leftJoin('attendance.shelterSchedule', 'schedule')
            .leftJoin('schedule.team', 'team')
            .where('attendance.member.id = :userId', { userId });

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

        const uniqueSchedules = [...new Set(records.map(r => r.schedule_id))];
        const totalEvents = uniqueSchedules.length;

        let pendingQuery = this.scheduleRepo.createQueryBuilder('schedule')
            .leftJoin('schedule.team', 'team')
            .leftJoin('team.leaders', 'leader', 'leader.user.id = :userId', { userId })
            .leftJoin('team.members', 'member', 'member.user.id = :userId', { userId })
            .where('(leader.user.id = :userId OR member.user.id = :userId)', { userId })
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

    async getTeamAttendanceStats(
        userId: string,
        teamId: string,
        startDate?: string,
        endDate?: string
    ): Promise<AttendanceStatsDto> {
        if (!userId) {
            throw new ForbiddenException('Usuário não identificado no token');
        }

        const user = await this.accessService.getUserWithMembership(userId);
        await this.accessService.assertLeaderAccess(user, teamId);

        const team = await this.teamRepo.findOne({
            where: { id: teamId },
            relations: ['members', 'members.user']
        });

        if (!team) {
            throw new NotFoundException('Time não encontrado');
        }

        const memberUsers = team.members?.map(t => t.user).filter(u => u) ?? [];
        const members = [...memberUsers];
        const memberIds = members.map(m => m.id);

        let query = this.attendanceRepo.createQueryBuilder('attendance')
            .leftJoin('attendance.shelterSchedule', 'schedule')
            .where('attendance.member.id IN (:...memberIds)', { memberIds })
            .andWhere('schedule.team.id = :teamId', { teamId });

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

    async listAttendanceSheetsHierarchical(userId: string, filters?: { startDate?: string; endDate?: string }): Promise<ShelterWithTeamsDto[]> {
        if (!userId) {
            throw new ForbiddenException('Usuário não identificado no token');
        }

        const user = await this.accessService.getUserWithMembership(userId);

        const teamIds = user.role === UserRole.ADMIN
            ? []
            : await this.accessService.getLeaderTeamIds(user.id);

        if (user.role !== UserRole.ADMIN && teamIds.length === 0) {
            return [];
        }

        let sheltersQuery = this.teamRepo.createQueryBuilder('team')
            .leftJoinAndSelect('team.shelter', 'shelter')
            .leftJoinAndSelect('team.members', 'members')
            .leftJoinAndSelect('members.user', 'memberUser');

        if (teamIds.length > 0) {
            sheltersQuery = sheltersQuery.where('team.id IN (:...teamIds)', { teamIds });
        }

        const teams = await sheltersQuery.getMany();
        interface ShelterMapData {
            shelterId: string;
            shelterName: string;
            totalTeams: number;
            teams: any[]; // We will fix this 'any' inside the loop logic if possible, or define a specific type for team structure here
        }

        const sheltersMap: Record<string, ShelterMapData> = {};

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

        const result: ShelterWithTeamsDto[] = [];

        for (const shelterData of Object.values(sheltersMap)) {
            const shelterTeams = teams.filter(team => team.shelter.id === shelterData.shelterId);
            const teamsWithSchedules: TeamWithSchedulesDto[] = [];

            for (const team of shelterTeams) {
                let schedulesQuery = this.scheduleRepo.createQueryBuilder('schedule')
                    .where('schedule.team.id = :teamId', { teamId: team.id })
                    .leftJoinAndSelect('schedule.team', 'team')
                    .leftJoinAndSelect('team.shelter', 'shelter')
                    .orderBy('COALESCE(schedule.visitDate, schedule.meetingDate)', 'DESC');

                if (filters?.startDate) {
                    schedulesQuery = schedulesQuery.andWhere('(schedule.visitDate >= :startDate OR schedule.meetingDate >= :startDate)', { startDate: filters.startDate });
                }
                if (filters?.endDate) {
                    schedulesQuery = schedulesQuery.andWhere('(schedule.visitDate <= :endDate OR schedule.meetingDate <= :endDate)', { endDate: filters.endDate });
                }

                const schedules = await schedulesQuery.getMany();
                const schedulesWithAttendance: ScheduleWithAttendanceDto[] = [];

                for (const schedule of schedules) {
                    const memberCount = team.members?.length || 0;
                    const allAttendances = await this.attendanceRepo.find({
                        where: { shelterSchedule: { id: schedule.id } },
                        relations: ['member']
                    });

                    if (schedule.visitDate) {
                        const visitAttendances = allAttendances.filter(a => a.category === AttendanceCategory.VISIT);
                        const presentCount = visitAttendances.filter(a => a.type === AttendanceType.PRESENT).length;
                        const absentCount = visitAttendances.filter(a => a.type === AttendanceType.ABSENT).length;
                        const pendingCount = Math.max(0, memberCount - visitAttendances.length);

                        const attendanceRecords: AttendanceRecordDto[] = visitAttendances.map(attendance => ({
                            id: attendance.id,
                            type: attendance.type,
                            category: attendance.category,
                            comment: attendance.comment,
                            memberId: attendance.member.id,
                            memberName: attendance.member.name,
                            memberEmail: attendance.member.email,
                            createdAt: attendance.createdAt,
                            updatedAt: attendance.updatedAt
                        }));

                        schedulesWithAttendance.push({
                            scheduleId: schedule.id,
                            category: AttendanceCategory.VISIT,
                            date: schedule.visitDate,
                            visitNumber: schedule.visitNumber,
                            lessonContent: schedule.lessonContent,
                            observation: schedule.observation,
                            location: `Abrigo - ${team.shelter.name}`,
                            totalMembers: memberCount,
                            presentCount,
                            absentCount,
                            pendingCount,
                            attendanceRecords
                        });
                    }

                    if (schedule.meetingDate) {
                        const meetingAttendances = allAttendances.filter(a => a.category === AttendanceCategory.MEETING);
                        const presentCount = meetingAttendances.filter(a => a.type === AttendanceType.PRESENT).length;
                        const absentCount = meetingAttendances.filter(a => a.type === AttendanceType.ABSENT).length;
                        const pendingCount = Math.max(0, memberCount - meetingAttendances.length);

                        const attendanceRecords: AttendanceRecordDto[] = meetingAttendances.map(attendance => ({
                            id: attendance.id,
                            type: attendance.type,
                            category: attendance.category,
                            comment: attendance.comment,
                            memberId: attendance.member.id,
                            memberName: attendance.member.name,
                            memberEmail: attendance.member.email,
                            createdAt: attendance.createdAt,
                            updatedAt: attendance.updatedAt
                        }));

                        schedulesWithAttendance.push({
                            scheduleId: schedule.id,
                            category: AttendanceCategory.MEETING,
                            date: schedule.meetingDate,
                            visitNumber: schedule.visitNumber,
                            lessonContent: schedule.lessonContent,
                            observation: schedule.observation,
                            location: `NIB - ${schedule.meetingRoom || 'Sem local'}`,
                            totalMembers: memberCount,
                            presentCount,
                            absentCount,
                            pendingCount,
                            attendanceRecords
                        });
                    }
                }

                schedulesWithAttendance.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

                teamsWithSchedules.push({
                    teamId: team.id,
                    teamNumber: team.numberTeam,
                    teamName: team.description || `Equipe ${team.numberTeam}`,
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
