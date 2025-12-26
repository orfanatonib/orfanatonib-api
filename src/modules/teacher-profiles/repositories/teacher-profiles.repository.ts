import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository, SelectQueryBuilder } from 'typeorm';

import { TeacherProfileEntity } from '../entities/teacher-profile.entity/teacher-profile.entity';
import { TeamEntity } from 'src/modules/teams/entities/team.entity';
import { ShelterEntity } from 'src/modules/shelters/entities/shelter.entity/shelter.entity';
import { UserEntity } from 'src/user/user.entity';
import { TeacherSimpleListDto, toTeacherSimple } from '../dto/teacher-simple-list.dto';
import { TeacherProfilesQueryDto } from '../dto/teacher-profiles.query.dto';

type RoleCtx = { role?: string; userId?: string | null };
type SortDir = 'ASC' | 'DESC';

@Injectable()
export class TeacherProfilesRepository {
  constructor(
    private readonly dataSource: DataSource,

    @InjectRepository(TeacherProfileEntity)
    private readonly teacherRepo: Repository<TeacherProfileEntity>,

  @InjectRepository(ShelterEntity)
  private readonly shelterRepo: Repository<ShelterEntity>,

    @InjectRepository(UserEntity)
    private readonly userRepo: Repository<UserEntity>,
  ) { }

  private baseQB(): SelectQueryBuilder<TeacherProfileEntity> {
    return this.teacherRepo
      .createQueryBuilder('teacher')
      .leftJoinAndSelect('teacher.team', 'team')
      .leftJoinAndSelect('team.shelter', 'shelter')
      .leftJoinAndSelect('shelter.address', 'shelter_address')
      .leftJoinAndSelect('team.leaders', 'leaders')
      .leftJoin('teacher.user', 'teacher_user')
      .addSelect([
        'teacher_user.id',
        'teacher_user.name',
        'teacher_user.email',
        'teacher_user.phone',
        'teacher_user.active',
        'teacher_user.completed',
        'teacher_user.commonUser',
      ])
      .leftJoin('leaders.user', 'leader_user')
      .addSelect([
        'leader_user.id',
        'leader_user.name',
        'leader_user.email',
        'leader_user.phone',
        'leader_user.active',
        'leader_user.completed',
        'leader_user.commonUser',
      ])
      .andWhere('teacher_user.active = true');
  }

  private baseIdsQuery(): SelectQueryBuilder<TeacherProfileEntity> {
    return this.teacherRepo
      .createQueryBuilder('teacher')
      .leftJoin('teacher.user', 'teacher_user')
      .leftJoin('teacher.team', 'team')
      .leftJoin('team.shelter', 'shelter')
      .leftJoin('shelter.address', 'shelter_address')
      .leftJoin('team.leaders', 'leaders')
      .leftJoin('leaders.user', 'leader_user')
      .where('teacher_user.active = true');
  }

  private resolveSort(sort?: string) {
    const map: Record<string, string> = {
      createdAt: 'teacher.createdAt',
      updatedAt: 'teacher.updatedAt',
      name: 'teacher_user.name',
    };
    return map[sort ?? 'updatedAt'] ?? 'teacher.updatedAt';
  }

  private applyRoleFilter(qb: SelectQueryBuilder<TeacherProfileEntity>, ctx?: RoleCtx) {
    const role = ctx?.role?.toLowerCase();
    const userId = ctx?.userId;
    if (!role || role === 'admin' || !userId) return;

    if (role === 'leader') {
      qb.andWhere('leader_user.id = :uid', { uid: userId }).distinct(true);
    } else if (role === 'teacher') {
      qb.andWhere('1 = 0');
    }
  }

  private coerceInt(input: unknown): number | undefined {
    if (input === undefined || input === null || input === '') return undefined;
    const n = Number(String(input).trim());
    return Number.isInteger(n) ? n : undefined;
  }

  private applyFilters(
    qb: SelectQueryBuilder<TeacherProfileEntity>,
    params: TeacherProfilesQueryDto,
  ) {
    const { teacherSearchString, shelterSearchString, hasShelter, teamId, teamName, hasTeam } = params;

    if (teacherSearchString?.trim()) {
      const text = teacherSearchString.trim();
      const like = `%${text.toLowerCase()}%`;
      const likeRaw = `%${text}%`;
      
      qb.andWhere(
        `(
          LOWER(teacher_user.name)  LIKE :teacherLike OR
          LOWER(teacher_user.email) LIKE :teacherLike OR
          teacher_user.phone        LIKE :teacherLikeRaw
        )`,
        { teacherLike: like, teacherLikeRaw: likeRaw },
      );
    }

    if (shelterSearchString?.trim()) {
      const text = shelterSearchString.trim();
      const like = `%${text.toLowerCase()}%`;
      const likeRaw = `%${text}%`;
      
      qb.andWhere(
        `(
          LOWER(shelter.name)        LIKE :shelterLike OR
          LOWER(shelter_address.street) LIKE :shelterLike OR
          LOWER(shelter_address.district) LIKE :shelterLike OR
          LOWER(shelter_address.city) LIKE :shelterLike OR
          LOWER(shelter_address.state) LIKE :shelterLike OR
          shelter_address.postalCode LIKE :shelterLikeRaw OR
          LOWER(leader_user.name)    LIKE :shelterLike OR
          LOWER(leader_user.email)   LIKE :shelterLike OR
          leader_user.phone          LIKE :shelterLikeRaw
        )`,
        { shelterLike: like, shelterLikeRaw: likeRaw },
      );
    }

    if (hasShelter !== undefined) {
      if (hasShelter === true) {
        qb.andWhere('teacher.team_id IS NOT NULL');
      } else {
        qb.andWhere('teacher.team_id IS NULL');
      }
    }

    if (teamId?.trim()) {
      qb.andWhere('teacher.team_id = :teamId', { teamId: teamId.trim() });
    }

    if (teamName?.trim()) {
      const teamNumber = parseInt(teamName.trim(), 10);
      if (!isNaN(teamNumber)) {
        qb.andWhere('team.numberTeam = :teamNumber', { teamNumber });
      }
    }

    if (hasTeam !== undefined) {
      if (hasTeam === true) {
        qb.andWhere('teacher.team_id IS NOT NULL');
      } else {
        qb.andWhere('teacher.team_id IS NULL');
      }
    }

    return qb;
  }

  async findOneWithShelterAndLeaderOrFail(id: string, ctx?: RoleCtx): Promise<TeacherProfileEntity> {
    const qb = this.baseQB().andWhere('teacher.id = :id', { id });
    this.applyRoleFilter(qb, ctx);

    const teacher = await qb.getOne();
    if (!teacher) throw new NotFoundException('TeacherProfile not found');
    return teacher;
  }

  async findPageWithFilters(
    query: TeacherProfilesQueryDto,
    ctx?: RoleCtx,
  ): Promise<{
    items: TeacherProfileEntity[];
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
    const sortDir: SortDir = (order || 'desc').toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
    const offset = (page - 1) * limit;

    const totalQB = this.applyFilters(this.baseIdsQuery(), query)
      .select('teacher.id')
      .distinct(true);
    this.applyRoleFilter(totalQB, ctx);
    const total = await totalQB.getCount();

    const idsQB = this.applyFilters(this.baseIdsQuery(), query)
      .select('teacher.id', 'id')
      .addSelect(sortColumn, 'ord')
      .distinct(true)
      .orderBy(sortColumn, sortDir)
      .offset(offset)
      .limit(limit);
    this.applyRoleFilter(idsQB, ctx);
    const pageIds = await idsQB.getRawMany<{ id: string }>();
    const ids = pageIds.map((r) => r.id);

    if (!ids.length) {
      return { items: [], total, page, limit };
    }

    const itemsQB = this.baseQB()
      .andWhere('teacher.id IN (:...ids)', { ids })
      .orderBy(sortColumn, sortDir)
      .addOrderBy('shelter.name', 'ASC')
      .addOrderBy('teacher.createdAt', 'ASC');
    this.applyRoleFilter(itemsQB, ctx);
    const items = await itemsQB.getMany();

    return { items, total, page, limit };
  }

  async list(ctx?: RoleCtx): Promise<TeacherSimpleListDto[]> {
    const qb = this.teacherRepo
      .createQueryBuilder('teacher')
      .leftJoin('teacher.user', 'user')
      .addSelect(['user.id', 'user.name', 'user.email', 'user.active'])
      .where('user.active = true')
      .andWhere('teacher.team_id IS NULL')
      .orderBy('teacher.createdAt', 'ASC');

    if (ctx?.role === 'teacher') {
      qb.andWhere('1 = 0');
    }

    const items = await qb.getMany();
    return items.map(toTeacherSimple);
  }



  async createForUser(userId: string): Promise<TeacherProfileEntity> {
    return this.dataSource.transaction(async (manager) => {
      const txTeacher = manager.withRepository(this.teacherRepo);
      const txUser = manager.withRepository(this.userRepo);

      const user = await txUser.findOne({ where: { id: userId } });
      if (!user) throw new NotFoundException('User not found');

      const existing = await txTeacher.findOne({ where: { user: { id: userId } } });
      if (existing) return existing;

      const entity = txTeacher.create({ user: user as any, active: true, team: null as any });
      return txTeacher.save(entity);
    });
  }

  async removeByUserId(userId: string): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      const txTeacher = manager.withRepository(this.teacherRepo);
      const profile = await txTeacher.findOne({ where: { user: { id: userId } } });
      if (!profile) return;
      await txTeacher.delete(profile.id);
    });
  }

  async userHasAccessToShelter(clubId: string, ctx?: RoleCtx): Promise<boolean> {
    const role = ctx?.role?.toLowerCase();
    const userId = ctx?.userId;
    if (!role || role === 'admin') return true;
    if (!userId) return false;

    const qb = this.shelterRepo
      .createQueryBuilder('shelter')
      .where('shelter.id = :clubId', { clubId });

    if (role === 'leader') {
      qb.leftJoin('shelter.teams', 'teams')
        .leftJoin('teams.leaders', 'leaders')
        .leftJoin('leaders.user', 'leader_user')
        .andWhere('leader_user.id = :uid', { uid: userId });
    } else if (role === 'teacher') {
      qb.leftJoin('shelter.teams', 'teams')
        .leftJoin('teams.teachers', 'teachers')
        .leftJoin('teachers.user', 'teacher_user')
        .andWhere('teacher_user.id = :uid', { uid: userId });
    } else {
      return false;
    }

    const hasGetExists = typeof (qb as any).getExists === 'function';
    return hasGetExists ? !!(await (qb as any).getExists()) : (await qb.getCount()) > 0;
  }
}
