import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  DataSource,
  Repository,
  SelectQueryBuilder,
  EntityManager,
} from 'typeorm';

import { LeaderProfileEntity } from '../entities/leader-profile.entity/leader-profile.entity';
import { TeamEntity } from 'src/modules/teams/entities/team.entity';
import { ShelterEntity } from 'src/modules/shelters/entities/shelter.entity/shelter.entity';
import { UserEntity } from 'src/user/user.entity';
import {
  LeaderSimpleListDto,
  toLeaderSimple,
} from '../dto/leader-simple-list.dto';
import { LeaderProfilesQueryDto } from '../dto/leader-profiles.query.dto';

type SortDir = 'ASC' | 'DESC';

@Injectable()
export class LeaderProfilesRepository {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(LeaderProfileEntity)
    private readonly leaderRepo: Repository<LeaderProfileEntity>,
    @InjectRepository(UserEntity)
    private readonly userRepo: Repository<UserEntity>,
    @InjectRepository(ShelterEntity)
    private readonly shelterRepo: Repository<ShelterEntity>,
  ) {}

  private buildLeaderBaseQB(
    manager?: EntityManager,
  ): SelectQueryBuilder<LeaderProfileEntity> {
    const repo = manager
      ? manager.getRepository(LeaderProfileEntity)
      : this.leaderRepo;

    return repo
      .createQueryBuilder('leader')
      .leftJoinAndSelect('leader.teams', 'team')
      .leftJoinAndSelect('team.shelter', 'shelter')
      .leftJoinAndSelect('team.teachers', 'teachers')
      .leftJoin('leader.user', 'leader_user')
      .addSelect([
        'leader_user.id',
        'leader_user.name',
        'leader_user.email',
        'leader_user.phone',
        'leader_user.active',
        'leader_user.completed',
        'leader_user.commonUser',
      ])
      .leftJoin('teachers.user', 'teacher_user')
      .addSelect([
        'teacher_user.id',
        'teacher_user.name',
        'teacher_user.email',
        'teacher_user.phone',
        'teacher_user.active',
        'teacher_user.completed',
        'teacher_user.commonUser',
      ])
      .where('leader_user.active = true')
      .distinct(true);
  }

  private baseIdsQuery(): SelectQueryBuilder<LeaderProfileEntity> {
    return this.leaderRepo
      .createQueryBuilder('leader')
      .leftJoin('leader.user', 'leader_user')
      .where('leader_user.active = true');
  }

  private resolveSort(sort?: string) {
    const map: Record<string, string> = {
      createdAt: 'leader.createdAt',
      updatedAt: 'leader.updatedAt',
      name: 'leader_user.name',
    };
    return map[sort ?? 'updatedAt'] ?? 'leader.updatedAt';
  }

  private coerceShelterId(input: unknown): string | undefined {
    if (input === undefined || input === null || input === '') return undefined;
    const s = String(input).trim();
    return s ? s : undefined;
  }

  private applyFilters(
    qb: SelectQueryBuilder<LeaderProfileEntity>,
    params: LeaderProfilesQueryDto,
  ) {
    const { leaderSearchString, shelterSearchString, hasShelter, teamId, teamName, hasTeam } = params;

    if (leaderSearchString?.trim()) {
      const like = `%${leaderSearchString.trim().toLowerCase()}%`;
      const likeRaw = `%${leaderSearchString.trim()}%`;
      qb.andWhere(
        `(
          LOWER(leader_user.name) LIKE :leaderSearchString OR
          LOWER(leader_user.email) LIKE :leaderSearchString OR
          leader_user.phone LIKE :leaderSearchStringRaw
        )`,
        { 
          leaderSearchString: like, 
          leaderSearchStringRaw: likeRaw 
        }
      );
    }

    if (shelterSearchString?.trim()) {
      const like = `%${shelterSearchString.trim().toLowerCase()}%`;
      const likeRaw = `%${shelterSearchString.trim()}%`;
      qb.andWhere(
        `EXISTS (
          SELECT 1
          FROM leader_teams lt
          JOIN teams t ON t.id = lt.team_id
          JOIN shelters s ON s.id = t.shelter_id
          LEFT JOIN addresses shelter_addr ON shelter_addr.id = s.address_id
          WHERE lt.leader_id = leader.id
            AND (
              LOWER(s.name) LIKE :shelterSearchString OR
              LOWER(shelter_addr.street) LIKE :shelterSearchString OR
              LOWER(shelter_addr.number) LIKE :shelterSearchString OR
              LOWER(shelter_addr.district) LIKE :shelterSearchString OR
              LOWER(shelter_addr.city) LIKE :shelterSearchString OR
              LOWER(shelter_addr.state) LIKE :shelterSearchString OR
              shelter_addr.postalCode LIKE :shelterSearchStringRaw OR
              LOWER(shelter_addr.complement) LIKE :shelterSearchString
            )
        )`,
        { 
          shelterSearchString: like, 
          shelterSearchStringRaw: likeRaw 
        }
      );
    }

    if (hasShelter === true) {
      qb.andWhere(
        `EXISTS (
          SELECT 1 FROM leader_teams lt WHERE lt.leader_id = leader.id
        )`
      );
    } else if (hasShelter === false) {
      qb.andWhere(
        `NOT EXISTS (
          SELECT 1 FROM leader_teams lt WHERE lt.leader_id = leader.id
        )`
      );
    }

    if (teamId?.trim()) {
      qb.andWhere(
        `EXISTS (
          SELECT 1 FROM leader_teams lt 
          WHERE lt.leader_id = leader.id AND lt.team_id = :teamId
        )`,
        { teamId: teamId.trim() }
      );
    }

    if (teamName?.trim()) {
      const teamNumber = parseInt(teamName.trim(), 10);
      if (!isNaN(teamNumber)) {
        qb.andWhere(
          `EXISTS (
            SELECT 1 FROM leader_teams lt
            JOIN teams t ON t.id = lt.team_id
            WHERE lt.leader_id = leader.id
              AND t.numberTeam = :teamNumber
          )`,
          { teamNumber }
        );
      }
    }

    if (hasTeam === true) {
      qb.andWhere(
        `EXISTS (
          SELECT 1 FROM leader_teams lt WHERE lt.leader_id = leader.id
        )`
      );
    } else if (hasTeam === false) {
      qb.andWhere(
        `NOT EXISTS (
          SELECT 1 FROM leader_teams lt WHERE lt.leader_id = leader.id
        )`
      );
    }

    return qb;
  }

  async findPageWithFilters(query: LeaderProfilesQueryDto): Promise<{
    items: LeaderProfileEntity[];
    total: number;
    page: number;
    limit: number;
  }> {
    const {
      page = 1,
      limit = 12,
      sort = 'updatedAt',
      order = 'desc',
    } = query;

    const sortColumn = this.resolveSort(sort);
    const sortDir: SortDir =
      (order || 'desc').toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
    const offset = (page - 1) * limit;

    const total = await this.applyFilters(this.baseIdsQuery(), query)
      .select('leader.id')
      .distinct(true)
      .getCount();

    const pageIdsRaw = await this.applyFilters(this.baseIdsQuery(), query)
      .select('leader.id', 'id')
      .addSelect(sortColumn, 'ord')
      .distinct(true)
      .orderBy(sortColumn, sortDir)
      .offset(offset)
      .limit(limit)
      .getRawMany<{ id: string }>();

    const ids = pageIdsRaw.map((r) => r.id);
    if (!ids.length) {
      return { items: [], total, page, limit };
    }

    const items = await this.buildLeaderBaseQB()
      .andWhere('leader.id IN (:...ids)', { ids })
      .orderBy(sortColumn, sortDir)
      .addOrderBy('shelter.name', 'ASC')
      .addOrderBy('teachers.createdAt', 'ASC')
      .getMany();

    return { items, total, page, limit };
  }

  async findOneWithSheltersAndTeachersOrFail(
    id: string,
  ): Promise<LeaderProfileEntity> {
    const leader = await this.buildLeaderBaseQB()
      .andWhere('leader.id = :id', { id })
      .orderBy('shelter.name', 'ASC')
      .addOrderBy('teachers.createdAt', 'ASC')
      .getOne();

    if (!leader) throw new NotFoundException('LeaderProfile not found');
    return leader;
  }


  async createForUser(userId: string): Promise<LeaderProfileEntity> {
    return this.dataSource.transaction(async (manager) => {
      const txLeader = manager.withRepository(this.leaderRepo);
      const txUser = manager.withRepository(this.userRepo);

      const user = await txUser.findOne({ where: { id: userId } });
      if (!user) throw new NotFoundException('User not found');

      const existing = await txLeader.findOne({ where: { user: { id: userId } } });
      if (existing) return existing;

      const entity = txLeader.create({ user: user as any, active: true });
      return txLeader.save(entity);
    });
  }

  async removeByUserId(userId: string): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      const txLeader = manager.withRepository(this.leaderRepo);
      const txShelter = manager.withRepository(this.shelterRepo);

      const leader = await txLeader.findOne({
        where: { user: { id: userId } },
        relations: { teams: true },
      });
      if (!leader) return;

      if (leader.teams && leader.teams.length > 0) {
        leader.teams = [];
        await txLeader.save(leader);
      }

      await txLeader.delete(leader.id);
    });
  }

  async list(): Promise<LeaderSimpleListDto[]> {
    const items = await this.buildLeaderBaseQB()
      .orderBy('leader.createdAt', 'ASC')
      .addOrderBy('shelter.name', 'ASC')
      .getMany();

    return items.map(toLeaderSimple);
  }

  async findByUserId(userId: string): Promise<LeaderProfileEntity | null> {
    return this.leaderRepo.findOne({
      where: { user: { id: userId } },
      relations: ['teams'],
    });
  }
}