import { Injectable, NotFoundException } from '@nestjs/common';
import { Repository, DataSource } from 'typeorm';
import { ShelterScheduleEntity } from './entities/shelter-schedule.entity';

@Injectable()
export class ShelterScheduleRepository {
  private readonly repo: Repository<ShelterScheduleEntity>;

  constructor(private readonly ds: DataSource) {
    this.repo = ds.getRepository(ShelterScheduleEntity);
  }

  async findAll(): Promise<ShelterScheduleEntity[]> {
    return this.repo.find({
      order: { visitDate: 'ASC' } as any,
      relations: ['team', 'team.shelter'],
    });
  }

  async findById(id: string): Promise<ShelterScheduleEntity | null> {
    return this.repo.findOne({
      where: { id },
      relations: ['team', 'team.shelter'],
    });
  }

  async findByTeamId(teamId: string): Promise<ShelterScheduleEntity[]> {
    return this.repo.find({
      where: { team: { id: teamId } },
      relations: ['team', 'team.shelter'],
      order: { visitDate: 'ASC' } as any,
    });
  }

  async findByShelterId(shelterId: string): Promise<ShelterScheduleEntity[]> {
    return this.repo.find({
      where: { team: { shelter: { id: shelterId } } },
      relations: ['team', 'team.shelter'],
      order: { visitDate: 'ASC' } as any,
    });
  }

  async findByLeaderId(userId: string): Promise<ShelterScheduleEntity[]> {
    return this.repo.find({
      where: {
        team: {
          leaders: {
            user: { id: userId }
          }
        }
      },
      relations: ['team', 'team.shelter'],
      order: { visitDate: 'ASC' } as any,
    });
  }

  async findByMemberId(userId: string): Promise<ShelterScheduleEntity[]> {
    return this.repo.find({
      where: {
        team: {
          members: {
            user: { id: userId }
          }
        }
      },
      relations: ['team', 'team.shelter'],
      order: { visitDate: 'ASC' } as any,
    });
  }

  async findByTeamIdAndVisitNumber(teamId: string, visitNumber: number): Promise<ShelterScheduleEntity | null> {
    return this.repo.findOne({
      where: {
        team: { id: teamId },
        visitNumber: visitNumber,
      },
      relations: ['team', 'team.shelter'],
    });
  }

  async create(dto: any): Promise<ShelterScheduleEntity> {
    const entity = this.repo.create(dto);
    const saved = await this.repo.save(entity);
    return saved as unknown as ShelterScheduleEntity;
  }

  async update(id: string, dto: any): Promise<void> {
    await this.repo.update(id, dto);
  }

  async remove(id: string): Promise<void> {
    const entity = await this.repo.findOne({ where: { id } });
    if (!entity) throw new NotFoundException('Shelter schedule not found');
    await this.repo.remove(entity);
  }
}
