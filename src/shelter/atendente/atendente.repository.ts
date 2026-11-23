import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { DataSource, EntityManager, Repository, In } from "typeorm";
import { IntegrationEntity } from "src/shelter/integration/entities/integration.entity";
import { UserEntity } from "src/core/user/entities/user.entity";
import { AtendenteEntity } from "./entities/atendente.entity";
import { AttendableType } from "./entities/attendable-type.enum";
import { QueryAtendenteDto } from "./dto/query-atendente.dto";
import { AtendenteDocumentsFilter } from "./enums/atendente-documents-filter.enum";
import { AtendenteSortBy } from "./enums/atendente-sort-by.enum";
import { MediaTargetType } from "src/shared/media/media-target-type.enum";
import { SortOrder } from "src/shared/enums/sort-order.enum";
import {
  createdRange,
  escapeLike,
  normalizeSearch,
} from "src/shared/list-query/list-query.util";

/** O PDF estadual também pode estar no alvo legado (`Atendente`, anterior à separação estadual/federal). */
const ESTADUAL_TARGETS = [
  MediaTargetType.AtendenteEstadual,
  MediaTargetType.Atendente,
];

const HAS_ESTADUAL =
  "EXISTS (SELECT 1 FROM media_items me WHERE me.targetId = a.id AND me.targetType IN (:...estadualTargets))";
const HAS_FEDERAL =
  "EXISTS (SELECT 1 FROM media_items mf WHERE mf.targetId = a.id AND mf.targetType = :federalTarget)";

const DOCUMENTS_CLAUSES: Record<AtendenteDocumentsFilter, string> = {
  [AtendenteDocumentsFilter.COMPLETE]: `${HAS_ESTADUAL} AND ${HAS_FEDERAL}`,
  [AtendenteDocumentsFilter.ONLY_ESTADUAL]: `${HAS_ESTADUAL} AND NOT ${HAS_FEDERAL}`,
  [AtendenteDocumentsFilter.ONLY_FEDERAL]: `NOT ${HAS_ESTADUAL} AND ${HAS_FEDERAL}`,
};

/** Nome exibido no cartão: o do cadastro, ou o de quem é atendido (usuário/integração). */
const DISPLAY_NAME_SQL = "COALESCE(NULLIF(a.name, ''), u.name, i.name)";

@Injectable()
export class AtendenteRepository {
  constructor(
    @InjectRepository(AtendenteEntity)
    private readonly repo: Repository<AtendenteEntity>,
    @InjectRepository(IntegrationEntity)
    private readonly integrationRepo: Repository<IntegrationEntity>,
    @InjectRepository(UserEntity)
    private readonly userRepo: Repository<UserEntity>,
    private readonly dataSource: DataSource,
  ) {}

  /** Roda `work` numa transação: o cadastro e os PDFs dele se gravam juntos ou não se gravam. */
  runInTransaction<TResult>(
    work: (manager: EntityManager) => Promise<TResult>,
  ): Promise<TResult> {
    return this.dataSource.transaction(work);
  }

  private repoOf(manager?: EntityManager): Repository<AtendenteEntity> {
    return manager ? manager.getRepository(AtendenteEntity) : this.repo;
  }

  async create(
    data: Partial<AtendenteEntity>,
    manager?: EntityManager,
  ): Promise<AtendenteEntity> {
    const repo = this.repoOf(manager);
    return repo.save(repo.create(data));
  }

  /** Lê o cadastro travando a linha: edições simultâneas do mesmo antecedente se enfileiram. */
  async lockById(
    id: string,
    manager: EntityManager,
  ): Promise<AtendenteEntity | null> {
    return manager.getRepository(AtendenteEntity).findOne({
      where: { id },
      lock: { mode: "pessimistic_write" },
    });
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

  /** Busca, filtros, ordenação e recorte da página, tudo no banco. */
  async findAllPaginated(
    query: QueryAtendenteDto,
  ): Promise<{ data: AtendenteEntity[]; total: number }> {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 10));

    const qb = this.repo
      .createQueryBuilder("a")
      .leftJoin(
        UserEntity,
        "u",
        "a.attendableType = :userType AND u.id = a.attendableId",
        { userType: AttendableType.USER },
      )
      .leftJoin(
        IntegrationEntity,
        "i",
        "a.attendableType = :integrationType AND i.id = a.attendableId",
        { integrationType: AttendableType.INTEGRATION },
      );

    const search = normalizeSearch(query.search);
    if (search) {
      qb.andWhere(
        "(a.name LIKE :search ESCAPE '\\\\' OR u.name LIKE :search ESCAPE '\\\\' OR i.name LIKE :search ESCAPE '\\\\')",
        { search: `%${escapeLike(search)}%` },
      );
    }

    if (query.attendableType !== undefined) {
      qb.andWhere("a.attendableType = :attendableType", {
        attendableType: query.attendableType,
      });
    }

    if (query.attendableId?.trim()) {
      qb.andWhere("a.attendableId = :attendableId", {
        attendableId: query.attendableId.trim(),
      });
    }

    if (query.documents) {
      qb.andWhere(`(${DOCUMENTS_CLAUSES[query.documents]})`, {
        estadualTargets: ESTADUAL_TARGETS,
        federalTarget: MediaTargetType.AtendenteFederal,
      });
    }

    const { from, to } = createdRange(query);
    if (from) qb.andWhere("a.createdAt >= :createdFrom", { createdFrom: from });
    if (to) qb.andWhere("a.createdAt <= :createdTo", { createdTo: to });

    const direction = query.order ?? SortOrder.DESC;
    const column = query.sortBy ?? AtendenteSortBy.CREATED_AT;
    if (column === AtendenteSortBy.NAME) {
      qb.addSelect(DISPLAY_NAME_SQL, "display_name").orderBy(
        "display_name",
        direction,
      );
    } else {
      qb.orderBy(`a.${column}`, direction);
    }
    qb.addOrderBy("a.id", "ASC");

    // Os joins são 1:1 (um usuário/integração por vínculo): `offset/limit` não duplica linhas.
    const [data, total] = await qb
      .offset((page - 1) * limit)
      .limit(limit)
      .getManyAndCount();

    return { data, total };
  }

  async update(
    id: string,
    data: Partial<AtendenteEntity>,
    manager?: EntityManager,
  ): Promise<AtendenteEntity | null> {
    const repo = this.repoOf(manager);
    if (Object.keys(data).length > 0) await repo.update(id, data);
    return repo.findOne({ where: { id } });
  }

  async remove(id: string, manager?: EntityManager): Promise<void> {
    await this.repoOf(manager).delete(id);
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
