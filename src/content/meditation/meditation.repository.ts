import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { DeepPartial, ILike, Repository } from "typeorm";
import { MeditationEntity } from "./entities/meditation.entity";
import { QueryMeditationDto } from "./dto/query-meditation.dto";

@Injectable()
export class MeditationRepository {
  constructor(
    @InjectRepository(MeditationEntity)
    private readonly repo: Repository<MeditationEntity>,
  ) {}

  async findOneWithRelations(id: string): Promise<MeditationEntity | null> {
    return this.repo.findOne({
      where: { id },
      relations: ["days"],
    });
  }

  async findAllWithRelations(
    query?: QueryMeditationDto,
  ): Promise<MeditationEntity[]> {
    const search = query?.search?.trim();
    if (search) {
      return this.repo.find({
        where: { topic: ILike(`%${search}%`) },
        relations: ["days"],
        order: { startDate: "ASC" },
      });
    }

    return this.repo.find({
      relations: ["days"],
      order: { startDate: "ASC" },
    });
  }

  create(data: DeepPartial<MeditationEntity>): MeditationEntity {
    return this.repo.create(data);
  }

  async save(entity: DeepPartial<MeditationEntity>): Promise<MeditationEntity> {
    const created = this.repo.create(entity);
    return this.repo.save(created);
  }

  async remove(entity: MeditationEntity): Promise<MeditationEntity> {
    return this.repo.remove(entity);
  }

  async delete(id: string): Promise<void> {
    await this.repo.delete(id);
  }
}
