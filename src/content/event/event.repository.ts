import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { DataSource, DeepPartial, EntityManager, Repository } from "typeorm";
import type { QueryDeepPartialEntity } from "typeorm/query-builder/QueryPartialEntity";
import { EventEntity } from "./entities/event.entity";
import { QueryEventDto } from "./dto/query-event.dto";

@Injectable()
export class EventRepository {
  constructor(
    @InjectRepository(EventEntity)
    private readonly repo: Repository<EventEntity>,
    private readonly dataSource: DataSource,
  ) {}

  /** Roda `work` numa transação: o evento e a mídia dele se gravam juntos ou não se gravam. */
  runInTransaction<TResult>(
    work: (manager: EntityManager) => Promise<TResult>,
  ): Promise<TResult> {
    return this.dataSource.transaction(work);
  }

  async findAll(
    audiences?: string[],
    query?: QueryEventDto,
  ): Promise<EventEntity[]> {
    const qb = this.repo.createQueryBuilder("event");

    if (audiences && audiences.length > 0) {
      qb.andWhere("event.audience IN (:...audiences)", { audiences });
    }

    const search = query?.search?.trim();
    if (search) {
      qb.andWhere(
        "(LOWER(event.title) LIKE LOWER(:search) OR LOWER(event.description) LIKE LOWER(:search) OR LOWER(event.location) LIKE LOWER(:search))",
        { search: `%${search}%` },
      );
    }

    if (query?.startDate) {
      qb.andWhere("event.date >= :startDate", { startDate: query.startDate });
    }

    if (query?.endDate) {
      qb.andWhere("event.date <= :endDate", { endDate: query.endDate });
    }

    qb.orderBy("event.date", "ASC");

    return qb.getMany();
  }

  async findById(id: string): Promise<EventEntity | null> {
    return this.repo.findOne({ where: { id } });
  }

  async findByScheduleId(scheduleId: string): Promise<EventEntity[]> {
    return this.repo.find({ where: { shelterSchedule: { id: scheduleId } } });
  }

  async create(dto: DeepPartial<EventEntity>): Promise<EventEntity> {
    const entity = this.repo.create(dto);
    return this.repo.save(entity);
  }

  async update(
    id: string,
    dto: QueryDeepPartialEntity<EventEntity>,
    manager?: EntityManager,
  ): Promise<void> {
    const repo = manager ? manager.getRepository(EventEntity) : this.repo;
    await repo.update(id, dto);
  }

  async remove(id: string): Promise<void> {
    const entity = await this.repo.findOne({ where: { id } });
    if (!entity) throw new NotFoundException("Event not found");
    await this.repo.remove(entity);
  }
}
