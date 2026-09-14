import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, Like, FindOptionsWhere, In } from "typeorm";
import { IntegrationEntity } from "src/shelter/integration/entities/integration.entity";
import { UserEntity } from "src/core/user/entities/user.entity";
import { AtendenteEntity } from "./entities/atendente.entity";
import { AttendableType } from "./entities/attendable-type.enum";
import { QueryAtendenteDto } from "./dto/query-atendente.dto";

@Injectable()
export class AtendenteRepository {
  constructor(
    @InjectRepository(AtendenteEntity)
    private readonly repo: Repository<AtendenteEntity>,
    @InjectRepository(IntegrationEntity)
    private readonly integrationRepo: Repository<IntegrationEntity>,
    @InjectRepository(UserEntity)
    private readonly userRepo: Repository<UserEntity>,
  ) {}

  async create(data: Partial<AtendenteEntity>): Promise<AtendenteEntity> {
    const entity = this.repo.create(data);
    return this.repo.save(entity);
  }

  async findById(id: string): Promise<AtendenteEntity | null> {
    return this.repo.findOne({ where: { id } });
  }

  /** Um único antecedente por vínculo (pessoa). Os 2 PDFs ficam nesse registro. */
  async findByAttendable(
    attendableType: AttendableType,
    attendableId: string,
  ): Promise<AtendenteEntity | null> {
    return this.repo.findOne({
      where: { attendableType, attendableId },
    });
  }

  async findAllPaginated(
    query: QueryAtendenteDto,
  ): Promise<{ data: AtendenteEntity[]; total: number }> {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 10));
    const skip = (page - 1) * limit;

    const where: FindOptionsWhere<AtendenteEntity> = {};

    if (query.search?.trim()) {
      where.name = Like(`%${query.search.trim()}%`);
    }

    if (query.attendableType !== undefined) {
      where.attendableType = query.attendableType;
    }

    if (query.attendableId?.trim()) {
      where.attendableId = query.attendableId.trim();
    }

    const [data, total] = await this.repo.findAndCount({
      where,
      order: { createdAt: "DESC" },
      skip,
      take: limit,
    });

    return { data, total };
  }

  async update(
    id: string,
    data: Partial<AtendenteEntity>,
  ): Promise<AtendenteEntity | null> {
    await this.repo.update(id, data);
    return this.findById(id);
  }

  async remove(id: string): Promise<void> {
    await this.repo.delete(id);
  }

  async findIntegrationById(id: string): Promise<IntegrationEntity | null> {
    return this.integrationRepo.findOne({ where: { id } });
  }

  async findUserById(id: string): Promise<UserEntity | null> {
    return this.userRepo.findOne({ where: { id } });
  }

  async findIntegrationsByIds(ids: string[]): Promise<IntegrationEntity[]> {
    if (ids.length === 0) return [];
    return this.integrationRepo.find({ where: { id: In(ids) } });
  }

  async findUsersByIds(ids: string[]): Promise<UserEntity[]> {
    if (ids.length === 0) return [];
    return this.userRepo.find({ where: { id: In(ids) } });
  }
}
