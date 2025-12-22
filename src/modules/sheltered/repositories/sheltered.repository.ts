import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { ShelteredEntity } from '../entities/sheltered.entity';
import { QueryShelteredDto } from '../dto/query-sheltered.dto';
import { ShelterEntity } from 'src/modules/shelters/entities/shelter.entity/shelter.entity';

export type PaginatedRows<T> = { items: T[]; total: number };
type RoleCtx = { role?: string; userId?: string | null };

@Injectable()
export class ShelteredRepository {
  constructor(
    @InjectRepository(ShelteredEntity)
    private readonly repo: Repository<ShelteredEntity>,
    @InjectRepository(ShelterEntity)
    private readonly shelterRepo: Repository<ShelterEntity>,
  ) { }

  private baseQB(): SelectQueryBuilder<ShelteredEntity> {
    return this.repo
      .createQueryBuilder('c')
      .leftJoinAndSelect('c.shelter', 'shelter')
      .leftJoinAndSelect('c.address', 'addr')
      .leftJoinAndSelect('shelter.address', 'shelterAddress');
  }
  
  private applyRoleFilter(qb: SelectQueryBuilder<ShelteredEntity>, ctx?: RoleCtx) {
    const role = ctx?.role?.toLowerCase();
    const userId = ctx?.userId;
    if (!role || role === 'admin' || !userId) return;

    if (role === 'leader') {
      qb.leftJoin('shelter.teams', 'team')
        .leftJoin('team.leaders', 'leader')
        .leftJoin('leader.user', 'leaderUser')
        .andWhere('leaderUser.id = :uid', { uid: userId })
        .distinct(true);
    } else if (role === 'teacher') {
      qb.leftJoin('shelter.teams', 'team')
        .leftJoin('team.teachers', 'teachers')
        .leftJoin('teachers.user', 'teacherUser')
        .andWhere('teacherUser.id = :uid', { uid: userId })
        .distinct(true);
    }
  }

  async findAllPaginated(q: QueryShelteredDto, ctx?: RoleCtx): Promise<PaginatedRows<ShelteredEntity>> {
    const {
      page = 1,
      limit = 20,
      orderBy = 'name',
      order = 'ASC',
      searchString,
      shelterId,
    } = q;

    const qb = this.baseQB().distinct(true);
    this.applyRoleFilter(qb, ctx);

    if (searchString?.trim()) {
      const like = `%${searchString.trim()}%`;
      qb.andWhere(
        `(
          LOWER(c.name) LIKE LOWER(:searchString) OR
          LOWER(COALESCE(c.guardianName, '')) LIKE LOWER(:searchString) OR
          COALESCE(c.guardianPhone, '') LIKE :searchStringRaw
        )`,
        { searchString: like, searchStringRaw: `%${searchString.trim()}%` }
      );
    }

    // Filtro por ID do abrigo
    if (shelterId) {
      qb.andWhere('shelter.id = :shelterId', { shelterId });
    }

    const orderByMap: Record<string, string> = {
      name: 'c.name',
      birthDate: 'c.birthDate',
      joinedAt: 'c.joinedAt',
      createdAt: 'c.createdAt',
      updatedAt: 'c.updatedAt',
    };
    const sortField = orderByMap[orderBy] ?? 'c.name';
    const sortOrder = (order || 'ASC').toUpperCase() === 'DESC' ? 'DESC' : 'ASC';
    qb.orderBy(sortField, sortOrder as 'ASC' | 'DESC');

    qb.skip((page - 1) * limit).take(limit);

    const [items, total] = await qb.getManyAndCount();
    return { items, total };
  }

  async findAllSimple(
    query: { page?: number; limit?: number; searchString?: string; acceptedJesus?: 'accepted' | 'not_accepted' | 'all'; active?: 'active' | 'inactive' | 'all' },
    ctx?: RoleCtx,
  ): Promise<PaginatedRows<ShelteredEntity>> {
    const { page = 1, limit = 20, searchString, acceptedJesus = 'all', active = 'all' } = query;

    const qb = this.repo
      .createQueryBuilder('c')
      .leftJoinAndSelect('c.shelter', 'shelter')
      .leftJoinAndSelect('c.acceptedChrists', 'acceptedChrists');

    this.applyRoleFilter(qb, ctx);

    if (searchString?.trim()) {
      const like = `%${searchString.trim()}%`;
      qb.andWhere(
        `(
          LOWER(COALESCE(shelter.name, '')) LIKE LOWER(:searchString) OR
          LOWER(COALESCE(c.guardianName, '')) LIKE LOWER(:searchString) OR
          COALESCE(c.guardianPhone, '') LIKE :searchStringRaw
        )`,
        { searchString: like, searchStringRaw: `%${searchString.trim()}%` }
      );
    }

    // ✝️ Filtro: aceitou Jesus
    if (acceptedJesus === 'accepted') {
      qb.andWhere(
        `EXISTS (
          SELECT 1 FROM accepted_christs ac 
          WHERE ac.sheltered_id = c.id 
          AND ac.decision IN ('ACCEPTED', 'RECONCILED')
        )`
      );
    } else if (acceptedJesus === 'not_accepted') {
      qb.andWhere(
        `NOT EXISTS (
          SELECT 1 FROM accepted_christs ac 
          WHERE ac.sheltered_id = c.id 
          AND ac.decision IN ('ACCEPTED', 'RECONCILED')
        )`
      );
    }

    // ✅ Filtro: status ativo
    if (active === 'active') {
      qb.andWhere('c.active = :active', { active: true });
    } else if (active === 'inactive') {
      qb.andWhere('c.active = :active', { active: false });
    }

    qb.orderBy('c.active', 'DESC') // Ativos primeiro (true > false)

    qb.skip((page - 1) * limit).take(limit);

    const [items, total] = await qb.getManyAndCount();
    return { items, total };
  }

  async findOneForResponse(id: string, ctx?: RoleCtx): Promise<ShelteredEntity | null> {
    const qb = this.baseQB().where('c.id = :id', { id });
    this.applyRoleFilter(qb, ctx);
    return qb.getOne();
  }

  async userHasAccessToShelter(shelterId: string, ctx?: RoleCtx): Promise<boolean> {
    const role = ctx?.role?.toLowerCase();
    const userId = ctx?.userId;
    if (!role || role === 'admin' || !userId) return true;

    const qb = this.shelterRepo.createQueryBuilder('shelter').where('shelter.id = :shelterId', { shelterId });

    if (role === 'leader') {
      qb.leftJoin('shelter.teams', 'team')
        .leftJoin('team.leaders', 'leader')
        .leftJoin('leader.user', 'leaderUser')
        .andWhere('leaderUser.id = :uid', { uid: userId });
    } else if (role === 'teacher') {
      qb.leftJoin('shelter.teams', 'team')
        .leftJoin('team.teachers', 'teachers')
        .leftJoin('teachers.user', 'teacherUser')
        .andWhere('teacherUser.id = :uid', { uid: userId });
    }
    const count = await qb.getCount();
    return count > 0;
  }

  create(partial: Partial<ShelteredEntity>): ShelteredEntity {
    return this.repo.create(partial);
  }

  merge(target: ShelteredEntity, partial: Partial<ShelteredEntity>): ShelteredEntity {
    return this.repo.merge(target, partial);
  }

  save(entity: ShelteredEntity): Promise<ShelteredEntity> {
    return this.repo.save(entity);
  }

  delete(id: string): Promise<any> {
    return this.repo.delete(id);
  }
}