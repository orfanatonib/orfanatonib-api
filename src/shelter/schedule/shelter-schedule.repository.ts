import { Injectable, NotFoundException } from "@nestjs/common";
import { DataSource, DeepPartial, FindOptionsOrder, Repository } from "typeorm";
import type { QueryDeepPartialEntity } from "typeorm/query-builder/QueryPartialEntity";
import { ShelterScheduleEntity } from "./entities/shelter-schedule.entity";

/** Agenda sempre em ordem cronológica de visita. */
const BY_VISIT_DATE: FindOptionsOrder<ShelterScheduleEntity> = {
  visitDate: "ASC",
};

@Injectable()
export class ShelterScheduleRepository {
  private readonly repo: Repository<ShelterScheduleEntity>;

  constructor(private readonly ds: DataSource) {
    this.repo = ds.getRepository(ShelterScheduleEntity);
  }

  async findAll(): Promise<ShelterScheduleEntity[]> {
    return this.repo.find({
      order: BY_VISIT_DATE,
      relations: ["team", "team.shelter"],
    });
  }

  async findById(id: string): Promise<ShelterScheduleEntity | null> {
    return this.repo.findOne({
      where: { id },
      relations: ["team", "team.shelter"],
    });
  }

  async findByTeamId(teamId: string): Promise<ShelterScheduleEntity[]> {
    return this.repo.find({
      where: { team: { id: teamId } },
      relations: ["team", "team.shelter"],
      order: BY_VISIT_DATE,
    });
  }

  async findByShelterId(shelterId: string): Promise<ShelterScheduleEntity[]> {
    return this.repo.find({
      where: { team: { shelter: { id: shelterId } } },
      relations: ["team", "team.shelter"],
      order: BY_VISIT_DATE,
    });
  }

  async findByLeaderId(userId: string): Promise<ShelterScheduleEntity[]> {
    return this.repo.find({
      where: {
        team: {
          leaders: {
            user: { id: userId },
          },
        },
      },
      relations: ["team", "team.shelter"],
      order: BY_VISIT_DATE,
    });
  }

  async findByMemberId(userId: string): Promise<ShelterScheduleEntity[]> {
    return this.repo.find({
      where: {
        team: {
          members: {
            user: { id: userId },
          },
        },
      },
      relations: ["team", "team.shelter"],
      order: BY_VISIT_DATE,
    });
  }

  async findByTeamIdAndVisitNumber(
    teamId: string,
    visitNumber: number,
  ): Promise<ShelterScheduleEntity | null> {
    return this.repo.findOne({
      where: {
        team: { id: teamId },
        visitNumber: visitNumber,
      },
      relations: ["team", "team.shelter"],
    });
  }

  async create(
    dto: DeepPartial<ShelterScheduleEntity>,
  ): Promise<ShelterScheduleEntity> {
    return this.repo.save(this.repo.create(dto));
  }

  async update(
    id: string,
    dto: QueryDeepPartialEntity<ShelterScheduleEntity>,
  ): Promise<void> {
    await this.repo.update(id, dto);
  }

  async remove(id: string): Promise<void> {
    const entity = await this.repo.findOne({ where: { id } });
    if (!entity) throw new NotFoundException("Shelter schedule not found");
    await this.repo.remove(entity);
  }
}
