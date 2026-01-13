import { Injectable, NotFoundException, ForbiddenException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AttendanceEntity, AttendanceType, AttendanceCategory } from '../entities/attendance.entity';
import { ShelterScheduleEntity } from 'src/shelter/schedule/entities/shelter-schedule.entity';
import { TeamEntity } from 'src/shelter/team/entities/team.entity';
import { AttendanceResponseDto } from '../dto/attendance-response.dto';
import { AttendanceAccessService } from './attendance-access.service';

@Injectable()
export class AttendanceWriterService {
    private readonly logger = new Logger(AttendanceWriterService.name);

    constructor(
        @InjectRepository(AttendanceEntity)
        private readonly attendanceRepo: Repository<AttendanceEntity>,
        @InjectRepository(ShelterScheduleEntity)
        private readonly scheduleRepo: Repository<ShelterScheduleEntity>,
        @InjectRepository(TeamEntity)
        private readonly teamRepo: Repository<TeamEntity>,
        private readonly accessService: AttendanceAccessService,
    ) { }

    private validateScheduleDate(schedule: ShelterScheduleEntity): void {
        if (!schedule.meetingDate && !schedule.visitDate) {
            throw new ForbiddenException('Não é possível registrar presença/falta sem data de reunião ou visita válida.');
        }
    }

    async registerTeamAttendance(
        userId: string,
        teamId: string,
        scheduleId: string,
        attendances: Array<{ memberId: string; type: AttendanceType; comment?: string }>,
        category: AttendanceCategory = AttendanceCategory.VISIT,
    ): Promise<AttendanceResponseDto[]> {
        this.logger.log(`💾 Registrando frequência em lote - User: ${userId}, Team: ${teamId}, Schedule: ${scheduleId}, Category: ${category}, Members: ${attendances.length}`);

        const user = await this.accessService.getUserWithMembership(userId);
        await this.accessService.assertLeaderAccess(user, teamId);

        const schedule = await this.scheduleRepo.findOne({
            where: { id: scheduleId },
            relations: ['team', 'team.shelter']
        });

        if (!schedule) {
            throw new NotFoundException('Evento não encontrado');
        }

        this.validateScheduleDate(schedule);

        if (schedule.team.id !== teamId) {
            throw new ForbiddenException('Este evento não pertence ao time informado');
        }

        const team = await this.teamRepo.findOne({
            where: { id: teamId },
            relations: ['leaders', 'leaders.user', 'members', 'members.user']
        });

        if (!team) {
            throw new NotFoundException('Time não encontrado');
        }

        const memberUsers = team.members?.map(t => t.user).filter(u => u) ?? [];
        const members = [...memberUsers];
        const results: AttendanceEntity[] = [];
        for (const att of attendances) {
            const member = members.find(m => m.id === att.memberId);
            if (!member) {
                throw new BadRequestException(`Membro ${att.memberId} não encontrado no time`);
            }


            const existing = await this.attendanceRepo.findOne({
                where: {
                    member: { id: member.id },
                    shelterSchedule: { id: schedule.id },
                    category
                }
            });

            if (existing) {
                this.logger.debug(`Atualizando registro existente para membro ${member.id}, category: ${category}`);
                existing.type = att.type;
                existing.comment = att.comment;
                results.push(await this.attendanceRepo.save(existing));
            } else {
                this.logger.debug(`Criando novo registro para membro ${member.id}, category: ${category}`);
                const attendance = this.attendanceRepo.create({
                    member,
                    shelterSchedule: schedule,
                    type: att.type,
                    comment: att.comment,
                    category
                });
                results.push(await this.attendanceRepo.save(attendance));
            }
        }

        this.logger.log(`✅ Frequência registrada com sucesso - ${results.length} registro(s) criado(s)/atualizado(s) para categoria ${category}`);
        return results.map(this.mapToResponseDto);
    }

    async registerAttendance(
        memberId: string,
        scheduleId: string,
        type: AttendanceType,
        comment?: string,
        category: AttendanceCategory = AttendanceCategory.VISIT,
    ): Promise<AttendanceResponseDto> {
        this.logger.log(`💾 Registrando frequência individual - Member: ${memberId}, Schedule: ${scheduleId}, Category: ${category}`);

        const schedule = await this.scheduleRepo.findOne({
            where: { id: scheduleId },
            relations: ['team', 'team.shelter', 'team.leaders', 'team.leaders.user', 'team.members', 'team.members.user']
        });

        if (!schedule) {
            throw new NotFoundException('Evento não encontrado');
        }

        this.validateScheduleDate(schedule);

        const user = await this.accessService.getUserWithMembership(memberId);
        await this.accessService.assertTeamMembership(user, schedule.team.id);


        const existing = await this.attendanceRepo.findOne({
            where: {
                member: { id: memberId },
                shelterSchedule: { id: scheduleId },
                category
            }
        });

        if (existing) {
            this.logger.debug(`Atualizando registro existente para membro ${memberId}, category: ${category}`);
            existing.type = type;
            existing.comment = comment;
            const saved = await this.attendanceRepo.save(existing);
            return this.mapToResponseDto(saved);
        }

        this.logger.debug(`Criando novo registro para membro ${memberId}, category: ${category}`);
        const attendance = this.attendanceRepo.create({
            member: { id: memberId },
            shelterSchedule: schedule,
            type,
            comment,
            category
        });

        const saved = await this.attendanceRepo.save(attendance);
        this.logger.log(`✅ Frequência individual registrada com sucesso - category: ${category}`);
        return this.mapToResponseDto(saved);
    }

    private mapToResponseDto(entity: AttendanceEntity): AttendanceResponseDto {
        return {
            id: entity.id,
            type: entity.type,
            category: entity.category,
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
            teamName: entity.shelterSchedule.team.description || `Equipe ${entity.shelterSchedule.team.numberTeam}`,
            shelterName: entity.shelterSchedule.team.shelter.name,
            createdAt: entity.createdAt,
            updatedAt: entity.updatedAt
        };
    }
}
