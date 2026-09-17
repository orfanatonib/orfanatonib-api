import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { EventEntity } from "./entities/event.entity";
import { QueryEventDto } from "./dto/query-event.dto";

@Injectable()
export class EventRepository {
  constructor(
    @InjectRepository(EventEntity)
    private readonly repo: Repository<EventEntity>,
  ) {}

  async findAll(audiences?: string[], query?: QueryEventDto): Promise<EventEntity[]> {
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

  async create(dto: any): Promise<EventEntity> {
    const entity = this.repo.create(dto);
    const saved = await this.repo.save(entity);
    return saved as unknown as EventEntity;
  }

  async update(id: string, dto: any): Promise<void> {
    await this.repo.update(id, dto);
  }

  async remove(id: string): Promise<void> {
    const entity = await this.repo.findOne({ where: { id } });
    if (!entity) throw new NotFoundException("Event not found");
    await this.repo.remove(entity);
  }
}
