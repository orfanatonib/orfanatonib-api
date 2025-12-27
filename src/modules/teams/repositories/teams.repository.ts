import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { DataSource, Repository, In } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { TeamEntity } from '../entities/team.entity';
import { CreateTeamDto } from '../dto/create-team.dto';
import { UpdateTeamDto } from '../dto/update-team.dto';
import { LeaderProfileEntity } from 'src/modules/leader-profiles/entities/leader-profile.entity/leader-profile.entity';
import { TeacherProfileEntity } from 'src/modules/teacher-profiles/entities/teacher-profile.entity/teacher-profile.entity';
import { ShelterEntity } from 'src/modules/shelters/entities/shelter.entity/shelter.entity';

@Injectable()
export class TeamsRepository {
  private readonly logger = new Logger(TeamsRepository.name);

  constructor(
    @InjectRepository(TeamEntity)
    private readonly teamRepo: Repository<TeamEntity>,
    @InjectRepository(LeaderProfileEntity)
    private readonly leaderRepo: Repository<LeaderProfileEntity>,
    @InjectRepository(TeacherProfileEntity)
    private readonly teacherRepo: Repository<TeacherProfileEntity>,
    @InjectRepository(ShelterEntity)
    private readonly shelterRepo: Repository<ShelterEntity>,
    private readonly dataSource: DataSource,
  ) {}

  async create(dto: CreateTeamDto): Promise<TeamEntity> {
    return this.dataSource.transaction(async (manager) => {
      const txTeam = manager.withRepository(this.teamRepo);
      const txShelter = manager.withRepository(this.shelterRepo);

      const shelter = await txShelter.findOne({ where: { id: dto.shelterId } });
      if (!shelter) {
        throw new NotFoundException('Shelter not found');
      }

      const team = txTeam.create({
        numberTeam: dto.numberTeam,
        description: dto.description,
        shelter: shelter as any,
      });
      
      const savedTeam = await txTeam.save(team);
      
      if (!savedTeam || !savedTeam.id) {
        throw new Error('Error creating team: could not get ID');
      }
      
      const teamId = savedTeam.id;

      if (dto.leaderProfileIds && dto.leaderProfileIds.length > 0) {
        const placeholders = dto.leaderProfileIds.map(() => '?').join(',');
        const existingLinks = await manager.query(
          `SELECT leader_id FROM leader_teams WHERE team_id = ? AND leader_id IN (${placeholders})`,
          [teamId, ...dto.leaderProfileIds]
        );
        const existingLeaderIds = existingLinks.map((row: any) => row.leader_id);
        
        const leadersToAdd = dto.leaderProfileIds.filter(
          (id: string) => !existingLeaderIds.includes(id)
        );
        
        if (leadersToAdd.length > 0) {
          const values = leadersToAdd.map(() => '(?, ?)').join(', ');
          const params: any[] = [];
          leadersToAdd.forEach((leaderId: string) => {
            params.push(leaderId, teamId);
          });
          await manager.query(
            `INSERT INTO leader_teams (leader_id, team_id) VALUES ${values}`,
            params
          );
        }
      }

      if (dto.teacherProfileIds && dto.teacherProfileIds.length > 0) {
        const placeholders = dto.teacherProfileIds.map(() => '?').join(',');
        await manager.query(
          `UPDATE teacher_profiles SET team_id = NULL WHERE id IN (${placeholders}) AND team_id IS NOT NULL AND team_id != ?`,
          [...dto.teacherProfileIds, teamId]
        );

        await manager.query(
          `UPDATE teacher_profiles SET team_id = ? WHERE id IN (${placeholders})`,
          [teamId, ...dto.teacherProfileIds]
        );
      }

      const finalTeam = await txTeam.findOne({
        where: { id: teamId },
      });

      if (!finalTeam) {
        throw new Error('Team not found after creation');
      }

      return finalTeam;
    });
  }

  async findAll(): Promise<TeamEntity[]> {
    return this.teamRepo.find({
      relations: ['shelter', 'leaders', 'leaders.user', 'teachers', 'teachers.user'],
    });
  }

  async findOne(id: string): Promise<TeamEntity | null> {
    return this.teamRepo.findOne({
      where: { id },
      relations: ['shelter', 'leaders', 'leaders.user', 'teachers', 'teachers.user'],
    });
  }

  async findByShelter(shelterId: string): Promise<TeamEntity[]> {
    return this.teamRepo.find({
      where: { shelter: { id: shelterId } },
      relations: ['shelter', 'leaders', 'leaders.user', 'teachers', 'teachers.user'],
    });
  }

  async findByLeader(leaderId: string): Promise<TeamEntity[]> {
    return this.teamRepo.find({
      where: {
        leaders: { id: leaderId }
      },
      relations: ['shelter', 'leaders', 'leaders.user', 'teachers', 'teachers.user'],
    });
  }

  async findTeamByShelterAndNumber(shelterId: string, numberTeam: number): Promise<TeamEntity | null> {
    return this.teamRepo.findOne({
      where: {
        shelter: { id: shelterId },
        numberTeam: numberTeam
      },
      relations: ['shelter', 'leaders', 'leaders.user', 'teachers', 'teachers.user'],
    });
  }

  async update(id: string, dto: UpdateTeamDto): Promise<TeamEntity> {
    return this.dataSource.transaction(async (manager) => {
      const txTeam = manager.withRepository(this.teamRepo);
      const txLeader = manager.withRepository(this.leaderRepo);
      const txTeacher = manager.withRepository(this.teacherRepo);

      const team = await txTeam.findOne({ where: { id } });
      if (!team) {
        throw new NotFoundException('Team not found');
      }

      if (dto.numberTeam !== undefined) team.numberTeam = dto.numberTeam;
      if (dto.description !== undefined) team.description = dto.description;
      await txTeam.save(team);

      if (dto.leaderProfileIds !== undefined) {
        const leaderIdsInTeam = await txLeader
          .createQueryBuilder('leader')
          .innerJoin('leader.teams', 'team', 'team.id = :teamId', { teamId: id })
          .select('leader.id', 'id')
          .getRawMany();

        const leaderIds = leaderIdsInTeam.map((row: any) => row.id);

        if (leaderIds.length > 0) {
          const currentLeaders = await txLeader.find({
            where: { id: In(leaderIds) },
            relations: ['teams'],
          });

          for (const leader of currentLeaders) {
            if (leader.teams && Array.isArray(leader.teams)) {
              leader.teams = leader.teams.filter(t => t.id !== id);
              await txLeader.save(leader);
            }
          }
        }

        if (dto.leaderProfileIds.length > 0) {
          const leaders = await txLeader.find({
            where: { id: In(dto.leaderProfileIds) },
            relations: ['teams'],
          });

          for (const leader of leaders) {
            if (!leader.teams) {
              leader.teams = [];
            }
            const isAlreadyInTeam = leader.teams.some(t => t.id === id);
            if (!isAlreadyInTeam) {
              leader.teams.push(team as any);
              await txLeader.save(leader);
            }
          }
        }
      }

      if (dto.teacherProfileIds !== undefined) {
        const currentTeachers = await txTeacher.find({
          where: { team: { id } },
        });
        for (const teacher of currentTeachers) {
          teacher.team = null as any;
          await txTeacher.save(teacher);
        }

        if (dto.teacherProfileIds.length > 0) {
          const teachers = await txTeacher.find({
            where: { id: In(dto.teacherProfileIds) },
            relations: ['team'],
          });
          
          for (const teacher of teachers) {
            if (teacher.team && teacher.team.id !== id) {
              teacher.team = null as any;
              await txTeacher.save(teacher);
            }
            teacher.team = team as any;
            await txTeacher.save(teacher);
          }
        }
      }

      return team;
    });
  }

  async addLeadersToTeam(teamId: string, leaderProfileIds: string[]): Promise<TeamEntity> {
    return this.dataSource.transaction(async (manager) => {
      const txLeader = manager.withRepository(this.leaderRepo);
      const txTeam = manager.withRepository(this.teamRepo);

      const team = await txTeam.findOne({ where: { id: teamId } });
      if (!team) {
        throw new NotFoundException('Team not found');
      }

      if (leaderProfileIds.length > 0) {
        const leaders = await txLeader.find({
          where: { id: In(leaderProfileIds) },
          relations: ['teams'],
        });

        for (const leader of leaders) {
          if (!leader.teams) {
            leader.teams = [];
          }
          const isAlreadyInTeam = leader.teams.some(t => t.id === teamId);
          if (!isAlreadyInTeam) {
            leader.teams.push(team as any);
            await txLeader.save(leader);
          }
        }
      }

      return team;
    });
  }

  async removeLeadersFromTeam(teamId: string, leaderProfileIds: string[]): Promise<TeamEntity> {
    return this.dataSource.transaction(async (manager) => {
      const txLeader = manager.withRepository(this.leaderRepo);
      const txTeam = manager.withRepository(this.teamRepo);

      const team = await txTeam.findOne({ where: { id: teamId } });
      if (!team) {
        throw new NotFoundException('Team not found');
      }

      if (leaderProfileIds.length > 0) {
        const leaders = await txLeader.find({
          where: { id: In(leaderProfileIds) },
          relations: ['teams'],
        });

        for (const leader of leaders) {
          if (leader.teams && Array.isArray(leader.teams)) {
            leader.teams = leader.teams.filter(t => t.id !== teamId);
            await txLeader.save(leader);
          }
        }
      }

      return team;
    });
  }

  async removeLeaderFromAllTeams(leaderId: string): Promise<void> {
    return this.dataSource.transaction(async (manager) => {
      const txLeader = manager.withRepository(this.leaderRepo);

      const leader = await txLeader.findOne({
        where: { id: leaderId },
        relations: ['teams'],
      });

      if (leader && leader.teams && leader.teams.length > 0) {
        leader.teams = [];
        await txLeader.save(leader);
      }
    });
  }

  async remove(id: string): Promise<void> {
    const team = await this.teamRepo.findOne({ where: { id } });
    if (!team) {
      throw new NotFoundException('Team not found');
    }

    await this.dataSource.transaction(async (manager) => {
      const txLeader = manager.withRepository(this.leaderRepo);
      const txTeacher = manager.withRepository(this.teacherRepo);
      const txTeam = manager.withRepository(this.teamRepo);

      const leaders = await txLeader
        .createQueryBuilder('leader')
        .innerJoin('leader.teams', 'team', 'team.id = :teamId', { teamId: id })
        .getMany();

      for (const leader of leaders) {
        if (leader.teams) {
          leader.teams = leader.teams.filter(t => t.id !== id);
          await txLeader.save(leader);
        }
      }

      const teachers = await txTeacher.find({
        where: { team: { id } },
      });
      for (const teacher of teachers) {
        teacher.team = null as any;
        await txTeacher.save(teacher);
      }

      await txTeam.remove(team);
    });
  }
}

