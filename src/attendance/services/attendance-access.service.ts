import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserEntity } from 'src/core/user/entities/user.entity';
import { TeamEntity } from 'src/shelter/team/entities/team.entity';
import { UserRole } from 'src/core/auth/auth.types';

@Injectable()
export class AttendanceAccessService {

    constructor(
        @InjectRepository(UserEntity)
        private readonly userRepo: Repository<UserEntity>,
        @InjectRepository(TeamEntity)
        private readonly teamRepo: Repository<TeamEntity>,
    ) { }

    getUserTeamIds(user: UserEntity): string[] {
        const teamIds: string[] = [];

        if (user.memberProfile?.team) {
            teamIds.push(user.memberProfile.team.id);
        }

        if (user.leaderProfile?.teams) {
            teamIds.push(...user.leaderProfile.teams.map((t: TeamEntity) => t.id));
        }

        return teamIds;
    }

    async getUserWithMembership(userId: string): Promise<UserEntity> {
        if (!userId) {
            throw new ForbiddenException('Usuário não identificado no token');
        }

        const user = await this.userRepo.findOne({
            where: { id: userId },
            relations: [
                'leaderProfile',
                'leaderProfile.teams',
                'leaderProfile.teams.shelter',
                'memberProfile',
                'memberProfile.team',
                'memberProfile.team.shelter'
            ]
        });

        if (!user) {
            throw new NotFoundException('Usuário não encontrado');
        }

        return user;
    }

    async getLeaderTeamIds(userId: string): Promise<string[]> {
        const rows = await this.teamRepo.createQueryBuilder('team')
            .leftJoin('team.leaders', 'leaderProfile')
            .leftJoin('leaderProfile.user', 'leaderUser')
            .where('leaderUser.id = :userId', { userId })
            .select('team.id', 'teamId')
            .getRawMany<{ teamId: string }>();

        return rows.map((r: { teamId: string }) => r.teamId);
    }

    async getMemberTeamIds(userId: string): Promise<string[]> {
        const rows = await this.teamRepo.createQueryBuilder('team')
            .leftJoin('team.members', 'memberProfile')
            .leftJoin('memberProfile.user', 'memberUser')
            .where('memberUser.id = :userId', { userId })
            .select('team.id', 'teamId')
            .getRawMany<{ teamId: string }>();

        return rows.map((r: { teamId: string }) => r.teamId);
    }

    async assertLeaderAccess(user: UserEntity, teamId: string) {
        if (user.role === UserRole.ADMIN) {
            return;
        }

        const leaderTeamIds = await this.getLeaderTeamIds(user.id);
        const isLeaderOfTeam = leaderTeamIds.includes(teamId);

        if (!isLeaderOfTeam) {
            throw new ForbiddenException('Você não é líder deste time');
        }
    }

    async assertTeamMembership(user: UserEntity, teamId: string) {
        if (user.role === UserRole.ADMIN) {
            return;
        }

        const [leaderTeamIds, memberTeamIds] = await Promise.all([
            this.getLeaderTeamIds(user.id),
            this.getMemberTeamIds(user.id),
        ]);

        const isMember = leaderTeamIds.includes(teamId) || memberTeamIds.includes(teamId);

        if (!isMember) {
            throw new ForbiddenException('Você não pertence a este time');
        }
    }
}
