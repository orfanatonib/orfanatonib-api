import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository, SelectQueryBuilder } from 'typeorm';
import { PagelaEntity } from './entities/pagela.entity';
import { ShelteredEntity } from 'src/modules/sheltered/entities/sheltered.entity';
import { TeacherProfileEntity } from 'src/modules/teacher-profiles/entities/teacher-profile.entity/teacher-profile.entity';
import { PagelaFiltersDto } from './dto/pagela-filters.dto';

@Injectable()
export class PagelasRepository {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(PagelaEntity)
    private readonly repo: Repository<PagelaEntity>,
    @InjectRepository(ShelteredEntity)
    private readonly shelteredRepo: Repository<ShelteredEntity>,
    @InjectRepository(TeacherProfileEntity)
    private readonly teacherRepo: Repository<TeacherProfileEntity>,
  ) { }

  private baseQB(): SelectQueryBuilder<PagelaEntity> {
    return this.repo
      .createQueryBuilder('p')
      .leftJoin('p.sheltered', 'sheltered')
      .addSelect(['sheltered.id', 'sheltered.name'])
      .leftJoin('p.teacher', 'teacher')
      .addSelect(['teacher.id'])
      .leftJoin('teacher.user', 'teacherUser')
      .addSelect(['teacherUser.id', 'teacherUser.name']);
  }

  private applyFilters(
    qb: SelectQueryBuilder<PagelaEntity>,
    f?: PagelaFiltersDto,
  ) {
    if (!f) return qb;

    if (f.shelteredId) {
      qb.andWhere('sheltered.id = :shelteredId', { shelteredId: f.shelteredId });
    }

    if (f.year !== undefined) {
      qb.andWhere('p.year = :year', { year: f.year });
    }

    if (f.visit !== undefined) {
      qb.andWhere('p.visit = :visit', { visit: f.visit });
    }

    if (f.present !== undefined) {
      qb.andWhere('p.present = :present', { present: f.present });
    }

    if (f.searchString?.trim()) {
      const like = `%${f.searchString.trim()}%`;
      qb.andWhere(
        `(
          CAST(p.visit AS CHAR) LIKE :searchStringRaw OR
          CAST(p.year AS CHAR) LIKE :searchStringRaw OR
          LOWER(COALESCE(p.notes, '')) LIKE LOWER(:searchString) OR
          LOWER(COALESCE(teacherUser.name, '')) LIKE LOWER(:searchString)
        )`,
        { searchString: like, searchStringRaw: `%${f.searchString.trim()}%` }
      );
    }

    return qb;
  }

  async findAllSimple(filters?: PagelaFiltersDto): Promise<PagelaEntity[]> {
    const qb = this.applyFilters(this.baseQB(), filters)
      .orderBy('p.year', 'DESC')
      .addOrderBy('p.visit', 'DESC')
      .addOrderBy('sheltered.name', 'ASC');

    return qb.getMany();
  }

  async findAllPaginated(
    filters: PagelaFiltersDto | undefined,
    page: number,
    limit: number,
  ): Promise<{ items: PagelaEntity[]; total: number }> {
    const qb = this.applyFilters(this.baseQB(), filters);
    qb.orderBy('p.year', 'DESC').addOrderBy('p.visit', 'DESC').addOrderBy('sheltered.name', 'ASC');

    const [items, total] = await qb.skip((page - 1) * limit).take(limit).getManyAndCount();
    return { items, total };
  }

  async findOneOrFail(id: string): Promise<PagelaEntity> {
    const qb = this.baseQB().where('p.id = :id', { id });
    const item = await qb.getOne();
    if (!item) throw new NotFoundException('Pagela not found');
    return item;
  }

  async findOneByChildYearVisitOrNull(shelteredId: string, year: number, visit: number): Promise<PagelaEntity | null> {
    return this.repo.findOne({
      where: { sheltered: { id: shelteredId }, year, visit },
      relations: { sheltered: true, teacher: true },
    });
  }

  async createOne(data: {
    shelteredId: string;
    teacherProfileId: string;
    referenceDate: string;
    year: number;
    visit: number;
    present: boolean;
    notes?: string | null;
  }): Promise<PagelaEntity> {
    return this.dataSource.transaction(async (manager) => {
      const txPagela = manager.withRepository(this.repo);
      const txSheltered = manager.withRepository(this.shelteredRepo);
      const txTeacher = manager.withRepository(this.teacherRepo);

      const [sheltered, teacher] = await Promise.all([
        txSheltered.findOne({ where: { id: data.shelteredId } }),
        txTeacher.findOne({ where: { id: data.teacherProfileId } }),
      ]);
      if (!sheltered) throw new NotFoundException('Sheltered not found');
      if (!teacher) throw new NotFoundException('TeacherProfile not found');

      const existing = await txPagela.findOne({
        where: { sheltered: { id: data.shelteredId }, year: data.year, visit: data.visit },
      });
      if (existing) {
        throw new BadRequestException('Pagela already exists for this sheltered in this visit/year');
      }

      const entity = txPagela.create({
        sheltered,
        teacher,
        referenceDate: data.referenceDate,
        year: data.year,
        visit: data.visit,
        present: data.present,
        notes: data.notes ?? null,
      });

      try {
        return await txPagela.save(entity);
      } catch (e: any) {
        if (e?.code === 'ER_DUP_ENTRY') {
          throw new BadRequestException('Já existe Pagela para este abrigado nesta visita/ano');
        }
        throw e;
      }
    });
  }

  async updateOne(id: string, data: Partial<PagelaEntity>): Promise<PagelaEntity> {
    return this.dataSource.transaction(async (manager) => {
      const txPagela = manager.withRepository(this.repo);
      const entity = await txPagela.findOne({
        where: { id },
        relations: { sheltered: true, teacher: true },
      });
      if (!entity) throw new NotFoundException('Pagela not found');

      if (data.teacher) {
      }

      Object.assign(entity, data);
      try {
        return await txPagela.save(entity);
      } catch (e: any) {
        if (e?.code === 'ER_DUP_ENTRY') {
          throw new BadRequestException('Pagela already exists for this sheltered in this visit/year');
        }
        throw e;
      }
    });
  }

  async remove(id: string): Promise<void> {
    const exists = await this.repo.findOne({ where: { id } });
    if (!exists) return;
    await this.repo.delete(id);
  }
}
