import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import {
  DataSource,
  EntityManager,
  Repository,
  Like,
  FindOptionsWhere,
} from "typeorm";
import { IntegrationEntity } from "./entities/integration.entity";
import { QueryIntegrationDto } from "./dto/query-integration.dto";

@Injectable()
export class IntegrationRepository {
  constructor(
    @InjectRepository(IntegrationEntity)
    private readonly repo: Repository<IntegrationEntity>,
    private readonly dataSource: DataSource,
  ) {}

  /** Roda `work` numa transação: o cadastro e as fotos dele se gravam juntos ou não se gravam. */
  runInTransaction<TResult>(
    work: (manager: EntityManager) => Promise<TResult>,
  ): Promise<TResult> {
    return this.dataSource.transaction(work);
  }

  async create(data: Partial<IntegrationEntity>): Promise<IntegrationEntity> {
    const entity = this.repo.create(data);
    return this.repo.save(entity);
  }

  async findAll(): Promise<IntegrationEntity[]> {
    return this.repo.find({ order: { name: "ASC" } });
  }

  async findAllPaginated(
    query: QueryIntegrationDto,
  ): Promise<{ data: IntegrationEntity[]; total: number }> {
    const { page = 1, limit = 10, search, integrationYear } = query;
    const skip = (page - 1) * limit;

    const where: FindOptionsWhere<IntegrationEntity> = {};

    if (search) {
      where.name = Like(`%${search}%`);
    }

    if (integrationYear !== undefined) {
      where.integrationYear = integrationYear;
    }

    const [data, total] = await this.repo.findAndCount({
      where,
      order: { name: "ASC" },
      skip,
      take: limit,
    });

    return { data, total };
  }

  async findById(id: string): Promise<IntegrationEntity | null> {
    return this.repo.findOne({ where: { id } });
  }

  async update(
    id: string,
    data: Partial<IntegrationEntity>,
    manager?: EntityManager,
  ): Promise<IntegrationEntity | null> {
    const repo = manager ? manager.getRepository(IntegrationEntity) : this.repo;
    await repo.update(id, data);
    return repo.findOne({ where: { id } });
  }

  async remove(id: string): Promise<void> {
    await this.repo.delete(id);
  }
}
