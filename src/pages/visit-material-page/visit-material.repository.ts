import { DataSource, Repository, SelectQueryBuilder } from 'typeorm';
import { Injectable } from '@nestjs/common';
import { VisitMaterialsPageEntity } from './entities/visit-material-page.entity';
import { QueryVisitMaterialsPageDto } from './dto/query-visit-material-pages.dto';

@Injectable()
export class VisitMaterialsPageRepository extends Repository<VisitMaterialsPageEntity> {
  constructor(private dataSource: DataSource) {
    super(VisitMaterialsPageEntity, dataSource.createEntityManager());
  }

  async findAllPages(): Promise<VisitMaterialsPageEntity[]> {
    return this.find({ relations: ['route'] });
  }

  async findAllPagesWithFilters(
    query: QueryVisitMaterialsPageDto,
  ): Promise<VisitMaterialsPageEntity[]> {
    const qb = this.createQueryBuilder('page')
      .leftJoinAndSelect('page.route', 'route');

    const { testament, searchString } = query;

    // 🔍 Filtro por testamento
    if (testament) {
      qb.andWhere('page.testament = :testament', { testament });
    }

    // 🔍 Busca unificada: title, subtitle, description
    if (searchString?.trim()) {
      const like = `%${searchString.trim()}%`;
      qb.andWhere(
        `(
          LOWER(page.title) LIKE LOWER(:searchString) OR
          LOWER(page.subtitle) LIKE LOWER(:searchString) OR
          LOWER(page.description) LIKE LOWER(:searchString)
        )`,
        { searchString: like },
      );
    }

    qb.orderBy('page.createdAt', 'DESC');

    return qb.getMany();
  }

  async findOnePageById(id: string): Promise<VisitMaterialsPageEntity | null> {
    return this.findOne({
      where: { id },
      relations: ['route'],
    });
  }

  async findCurrentWeek(): Promise<VisitMaterialsPageEntity | null> {
    return this.findOne({
      where: { currentWeek: true },
      relations: ['route'],
    });
  }

  async savePage(page: VisitMaterialsPageEntity): Promise<VisitMaterialsPageEntity> {
    return this.save(page);
  }

  async removePage(page: VisitMaterialsPageEntity): Promise<VisitMaterialsPageEntity> {
    return this.remove(page);
  }

  async upsertPage(
    id: string | undefined,
    pageData: Partial<VisitMaterialsPageEntity>,
  ): Promise<VisitMaterialsPageEntity> {
    if (id) {
      const existingPage = await this.findOnePageById(id);
      if (existingPage) {
        Object.assign(existingPage, pageData);
        return this.save(existingPage);
      }
    }
    const newPage = this.create(pageData);
    return this.save(newPage);
  }
}

