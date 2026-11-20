import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { ILike, Repository } from "typeorm";
import { InformativeEntity } from "./entities/informative.entity";
import { QueryInformativeDto } from "./dto/query-informative.dto";

@Injectable()
export class InformativeRepository {
  constructor(
    @InjectRepository(InformativeEntity)
    private readonly repo: Repository<InformativeEntity>,
  ) {}

  async findPublic(query?: QueryInformativeDto): Promise<InformativeEntity[]> {
    const search = query?.search?.trim();
    if (search) {
      return this.repo.find({
        where: [
          { public: true, title: ILike(`%${search}%`) },
          { public: true, description: ILike(`%${search}%`) },
        ],
        order: { createdAt: "DESC" },
      });
    }

    return this.repo.find({
      where: { public: true },
      order: { createdAt: "DESC" },
    });
  }

  async findAllSorted(
    query?: QueryInformativeDto,
  ): Promise<InformativeEntity[]> {
    const search = query?.search?.trim();
    if (search) {
      return this.repo.find({
        where: [
          { title: ILike(`%${search}%`) },
          { description: ILike(`%${search}%`) },
        ],
        order: { createdAt: "DESC" },
      });
    }

    return this.repo.find({
      order: { createdAt: "DESC" },
    });
  }

  async findOneWithRelations(id: string): Promise<InformativeEntity | null> {
    return this.repo.findOne({
      where: { id },
      relations: ["route"],
    });
  }

  async findOneById(id: string): Promise<InformativeEntity | null> {
    return this.repo.findOne({ where: { id }, relations: ["route"] });
  }

  async save(entity: Partial<InformativeEntity>): Promise<InformativeEntity> {
    const created = this.repo.create(entity);
    return this.repo.save(created);
  }

  async remove(entity: InformativeEntity): Promise<InformativeEntity> {
    return this.repo.remove(entity);
  }
}
