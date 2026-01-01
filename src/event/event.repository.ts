import { Injectable, NotFoundException } from '@nestjs/common';
import { Repository, DataSource, In } from 'typeorm';
import { EventEntity } from './entities/event.entity';

@Injectable()
export class EventRepository {
  private readonly repo: Repository<EventEntity>;

  constructor(private readonly ds: DataSource) {
    this.repo = ds.getRepository(EventEntity);
  }

  async findAll(audiences?: string[]): Promise<EventEntity[]> {
    const where = audiences && audiences.length > 0 ? { audience: In(audiences) } : {};
    return this.repo.find({ where, order: { date: 'ASC' } as any });
  }

  async findById(id: string): Promise<EventEntity | null> {
    return this.repo.findOne({ where: { id } });
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
    if (!entity) throw new NotFoundException('Event not found');
    await this.repo.remove(entity);
  }
}