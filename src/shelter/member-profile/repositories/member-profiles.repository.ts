import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository, SelectQueryBuilder } from 'typeorm';

import { MemberProfileEntity } from '../entities/member-profile.entity/member-profile.entity';
import { TeamEntity } from 'src/shelter/team/entities/team.entity';
import { ShelterEntity } from 'src/shelter/shelter/entities/shelter.entity/shelter.entity';
import { UserEntity } from 'src/core/user/entities/user.entity';
import { MemberSimpleListDto, toMemberSimple } from '../dto/member-simple-list.dto';
import { MemberProfilesQueryDto } from '../dto/member-profiles.query.dto';

type RoleCtx = { role?: string; userId?: string | null };
type SortDir = 'ASC' | 'DESC';

@Injectable()
export class MemberProfilesRepository {
  constructor(
    private readonly dataSource: DataSource,

    @InjectRepository(MemberProfileEntity)
    private readonly memberRepo: Repository<MemberProfileEntity>,

  @InjectRepository(ShelterEntity)
  private readonly shelterRepo: Repository<ShelterEntity>,

    @InjectRepository(UserEntity)
    private readonly userRepo: Repository<UserEntity>,
  ) { }

  private baseQB(): SelectQueryBuilder<MemberProfileEntity> {
    return this.memberRepo
      .createQueryBuilder('member')
      .leftJoinAndSelect('member.team', 'team')
      .leftJoinAndSelect('team.shelter', 'shelter')
      .leftJoinAndSelect('shelter.address', 'shelter_address')
      .leftJoinAndSelect('team.leaders', 'leaders')
      .leftJoin('member.user', 'member_user')
      .addSelect([
        'member_user.id',
        'member_user.name',
        'member_user.email',
        'member_user.phone',
        'member_user.active',
        'member_user.completed',
        'member_user.commonUser',
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
      .andWhere('member_user.active = true');
  }

  private baseIdsQuery(): SelectQueryBuilder<MemberProfileEntity> {
    return this.memberRepo
      .createQueryBuilder('member')
      .leftJoin('member.user', 'member_user')
      .leftJoin('member.team', 'team')
      .leftJoin('team.shelter', 'shelter')
      .leftJoin('shelter.address', 'shelter_address')
      .leftJoin('team.leaders', 'leaders')
      .leftJoin('leaders.user', 'leader_user')
      .where('member_user.active = true');
  }

  private resolveSort(sort?: string) {
    const map: Record<string, string> = {
      createdAt: 'member.createdAt',
      updatedAt: 'member.updatedAt',
      name: 'member_user.name',
    };
    return map[sort ?? 'updatedAt'] ?? 'member.updatedAt';
  }

  private applyRoleFilter(qb: SelectQueryBuilder<MemberProfileEntity>, ctx?: RoleCtx) {
    const role = ctx?.role?.toLowerCase();
    const userId = ctx?.userId;
    if (!role || role === 'admin' || !userId) return;

    if (role === 'leader') {
      qb.andWhere('leader_user.id = :uid', { uid: userId }).distinct(true);
    } else if (role === 'member') {
      qb.andWhere('1 = 0');
    }
  }

  private coerceInt(input: unknown): number | undefined {
    if (input === undefined || input === null || input === '') return undefined;
    const n = Number(String(input).trim());
    return Number.isInteger(n) ? n : undefined;
  }

  private applyFilters(
    qb: SelectQueryBuilder<MemberProfileEntity>,
    params: MemberProfilesQueryDto,
  ) {
    const { memberSearchString, shelterSearchString, hasShelter, teamId, teamName, hasTeam } = params;

    if (memberSearchString?.trim()) {
      const text = memberSearchString.trim();
      const like = `%${text.toLowerCase()}%`;
      const likeRaw = `%${text}%`;
      
      qb.andWhere(
        `(
          LOWER(member_user.name)  LIKE :memberLike OR
          LOWER(member_user.email) LIKE :memberLike OR
          member_user.phone        LIKE :memberLikeRaw
        )`,
        { memberLike: like, memberLikeRaw: likeRaw },
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
        qb.andWhere('member.team_id IS NOT NULL');
      } else {
        qb.andWhere('member.team_id IS NULL');
      }
    }

    if (teamId?.trim()) {
      qb.andWhere('member.team_id = :teamId', { teamId: teamId.trim() });
    }

    if (teamName?.trim()) {
      const teamNumber = parseInt(teamName.trim(), 10);
      if (!isNaN(teamNumber)) {
        qb.andWhere('team.numberTeam = :teamNumber', { teamNumber });
      }
    }

    if (hasTeam !== undefined) {
      if (hasTeam === true) {
        qb.andWhere('member.team_id IS NOT NULL');
      } else {
        qb.andWhere('member.team_id IS NULL');
      }
    }

    return qb;
  }

  async findOneWithShelterAndLeaderOrFail(id: string, ctx?: RoleCtx): Promise<MemberProfileEntity> {
    const qb = this.baseQB().andWhere('member.id = :id', { id });
    this.applyRoleFilter(qb, ctx);

    const member = await qb.getOne();
    if (!member) throw new NotFoundException('MemberProfile not found');
    return member;
  }

  async findPageWithFilters(
    query: MemberProfilesQueryDto,
    ctx?: RoleCtx,
  ): Promise<{
    items: MemberProfileEntity[];
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
      .select('member.id')
      .distinct(true);
    this.applyRoleFilter(totalQB, ctx);
    const total = await totalQB.getCount();

    const idsQB = this.applyFilters(this.baseIdsQuery(), query)
      .select('member.id', 'id')
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
      .andWhere('member.id IN (:...ids)', { ids })
      .orderBy(sortColumn, sortDir)
      .addOrderBy('shelter.name', 'ASC')
      .addOrderBy('member.createdAt', 'ASC');
    this.applyRoleFilter(itemsQB, ctx);
    const items = await itemsQB.getMany();

    return { items, total, page, limit };
  }

  async list(ctx?: RoleCtx): Promise<MemberSimpleListDto[]> {
    const qb = this.memberRepo
      .createQueryBuilder('member')
      .leftJoin('member.user', 'user')
      .addSelect(['user.id', 'user.name', 'user.email', 'user.active'])
      .where('user.active = true')
      .andWhere('member.team_id IS NULL')
      .orderBy('member.createdAt', 'ASC');

    if (ctx?.role === 'member') {
      qb.andWhere('1 = 0');
    }

    const items = await qb.getMany();
    return items.map(toMemberSimple);
  }



  async createForUser(userId: string): Promise<MemberProfileEntity> {
    return this.dataSource.transaction(async (manager) => {
      const txMember = manager.withRepository(this.memberRepo);
      const txUser = manager.withRepository(this.userRepo);

      const user = await txUser.findOne({ where: { id: userId } });
      if (!user) throw new NotFoundException('User not found');

      const existing = await txMember.findOne({ where: { user: { id: userId } } });
      if (existing) return existing;

      const entity = txMember.create({ user: user as any, active: true, team: null as any });
      return txMember.save(entity);
    });
  }

  async removeByUserId(userId: string): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      const txMember = manager.withRepository(this.memberRepo);
      const profile = await txMember.findOne({ where: { user: { id: userId } } });
      if (!profile) return;
      await txMember.delete(profile.id);
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
    } else if (role === 'member') {
      qb.leftJoin('shelter.teams', 'teams')
        .leftJoin('teams.members', 'members')
        .leftJoin('members.user', 'member_user')
        .andWhere('member_user.id = :uid', { uid: userId });
    } else {
      return false;
    }

    const hasGetExists = typeof (qb as any).getExists === 'function';
    return hasGetExists ? !!(await (qb as any).getExists()) : (await qb.getCount()) > 0;
  }
}
