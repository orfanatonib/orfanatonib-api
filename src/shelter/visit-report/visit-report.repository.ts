import { Injectable, NotFoundException } from '@nestjs/common';
import { Repository, DataSource } from 'typeorm';
import { VisitReportEntity } from './entities/visit-report.entity';

const FULL_RELATIONS = [
  'schedule',
  'schedule.team',
  'schedule.team.shelter',
  'schedule.team.shelter.address',
  'schedule.team.leaders',
  'schedule.team.leaders.user',
];

@Injectable()
export class VisitReportRepository {
  private readonly repo: Repository<VisitReportEntity>;

  constructor(private readonly ds: DataSource) {
    this.repo = ds.getRepository(VisitReportEntity);
  }

  async findAll(): Promise<VisitReportEntity[]> {
    return this.repo.find({
      order: { createdAt: 'DESC' },
      relations: FULL_RELATIONS,
    });
  }

  async findById(id: string): Promise<VisitReportEntity | null> {
    return this.repo.findOne({
      where: { id },
      relations: FULL_RELATIONS,
    });
  }

  async findByScheduleId(scheduleId: string): Promise<VisitReportEntity | null> {
    return this.repo.findOne({
      where: { schedule: { id: scheduleId } },
      relations: FULL_RELATIONS,
    });
  }

  async findByTeamId(teamId: string): Promise<VisitReportEntity[]> {
    return this.repo.find({
      where: { schedule: { team: { id: teamId } } },
      relations: FULL_RELATIONS,
      order: { createdAt: 'DESC' },
    });
  }

  async findByShelterId(shelterId: string): Promise<VisitReportEntity[]> {
    return this.repo.find({
      where: { schedule: { team: { shelter: { id: shelterId } } } },
      relations: FULL_RELATIONS,
      order: { createdAt: 'DESC' },
    });
  }

  async findByLeaderId(userId: string): Promise<VisitReportEntity[]> {
    return this.repo.find({
      where: {
        schedule: {
          team: {
            leaders: {
              user: { id: userId },
            },
          },
        },
      },
      relations: FULL_RELATIONS,
      order: { createdAt: 'DESC' },
    });
  }

  async create(entity: Partial<VisitReportEntity>): Promise<VisitReportEntity> {
    const created = this.repo.create(entity);
    const saved = await this.repo.save(created);
    return this.findById(saved.id) as Promise<VisitReportEntity>;
  }

  async update(id: string, entity: Partial<VisitReportEntity>): Promise<void> {
    await this.repo.update(id, entity);
  }

  async remove(id: string): Promise<void> {
    const entity = await this.repo.findOne({ where: { id } });
    if (!entity) throw new NotFoundException('Visit report not found');
    await this.repo.remove(entity);
  }
}
