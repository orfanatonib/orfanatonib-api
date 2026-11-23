import { Injectable, NotFoundException } from "@nestjs/common";
import { DataSource, DeepPartial, FindOptionsOrder, Repository } from "typeorm";
import type { QueryDeepPartialEntity } from "typeorm/query-builder/QueryPartialEntity";
import { ShelterScheduleEntity } from "./entities/shelter-schedule.entity";
import { TeamEntity } from "src/shelter/team/entities/team.entity";
import { SortOrder } from "src/shared/enums/sort-order.enum";
import {
  createdRange,
  escapeLike,
  isPaginated,
  normalizeSearch,
  pageWindow,
} from "src/shared/list-query/list-query.util";
import {
  QueryShelterScheduleDto,
  ScheduleKind,
  ScheduleSortBy,
} from "./dto/query-shelter-schedule.dto";

/** Quem lê: o escopo do papel vem antes de qualquer filtro do cliente. */
export type ScheduleScope =
  | { kind: "all" }
  | { kind: "leader"; userId: string }
  | { kind: "member"; userId: string }
  | { kind: "none" };

const EVENT_DATE = "COALESCE(s.visitDate, s.meetingDate)";

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

  /** Escopo + filtros + ordenação + (com `page`) recorte da página, tudo no banco. */
  async findFiltered(
    scope: ScheduleScope,
    query: QueryShelterScheduleDto = {},
  ): Promise<{ items: ShelterScheduleEntity[]; total: number }> {
    if (scope.kind === "none") return { items: [], total: 0 };

    const qb = this.repo
      .createQueryBuilder("s")
      .innerJoinAndSelect("s.team", "team")
      .innerJoinAndSelect("team.shelter", "shelter")
      .leftJoinAndSelect("shelter.address", "address");

    if (scope.kind === "leader") {
      const led = qb
        .subQuery()
        .select("lt.id")
        .from(TeamEntity, "lt")
        .innerJoin("lt.leaders", "ll")
        .innerJoin("ll.user", "lu")
        .where("lu.id = :scopeUser")
        .getQuery();
      qb.andWhere(`team.id IN ${led}`, { scopeUser: scope.userId });
    } else if (scope.kind === "member") {
      const mine = qb
        .subQuery()
        .select("mt.id")
        .from(TeamEntity, "mt")
        .innerJoin("mt.members", "mm")
        .innerJoin("mm.user", "mu")
        .where("mu.id = :scopeUser")
        .getQuery();
      qb.andWhere(`team.id IN ${mine}`, { scopeUser: scope.userId });
    }

    if (query.teamId)
      qb.andWhere("team.id = :teamId", { teamId: query.teamId });
    if (query.shelterId) {
      qb.andWhere("shelter.id = :shelterId", { shelterId: query.shelterId });
    }

    const search = normalizeSearch(query.search);
    if (search) {
      qb.andWhere(
        "(shelter.name LIKE :search ESCAPE '\\\\' OR s.lessonContent LIKE :search ESCAPE '\\\\' OR s.observation LIKE :search ESCAPE '\\\\' OR s.meetingRoom LIKE :search ESCAPE '\\\\')",
        { search: `%${escapeLike(search)}%` },
      );
    }

    if (query.kind === ScheduleKind.VISIT)
      qb.andWhere("s.visitDate IS NOT NULL");
    if (query.kind === ScheduleKind.MEETING) {
      qb.andWhere("s.meetingDate IS NOT NULL");
    }

    if (query.eventFrom) {
      qb.andWhere(`LEFT(${EVENT_DATE}, 10) >= :eventFrom`, {
        eventFrom: query.eventFrom.slice(0, 10),
      });
    }
    if (query.eventTo) {
      qb.andWhere(`LEFT(${EVENT_DATE}, 10) <= :eventTo`, {
        eventTo: query.eventTo.slice(0, 10),
      });
    }

    const { from, to } = createdRange(query);
    if (from) qb.andWhere("s.createdAt >= :createdFrom", { createdFrom: from });
    if (to) qb.andWhere("s.createdAt <= :createdTo", { createdTo: to });

    this.applyOrder(qb, query);

    if (isPaginated(query)) {
      const { skip, take } = pageWindow(query);
      qb.offset(skip).limit(take);
    }

    const [items, total] = await Promise.all([
      qb.getMany(),
      qb.clone().offset(undefined).limit(undefined).orderBy().getCount(),
    ]);
    return { items, total };
  }

  private applyOrder(
    qb: ReturnType<Repository<ShelterScheduleEntity>["createQueryBuilder"]>,
    query: QueryShelterScheduleDto,
  ): void {
    const order = query.order ?? SortOrder.ASC;
    // Datas ausentes sempre por último, em qualquer sentido.
    switch (query.sortBy) {
      case ScheduleSortBy.EVENT_DATE:
        qb.addSelect(EVENT_DATE, "eventDateSort")
          .orderBy(`(${EVENT_DATE} IS NULL)`, "ASC")
          .addOrderBy("eventDateSort", order)
          .addOrderBy("shelter.name", "ASC");
        break;
      case ScheduleSortBy.SHELTER_NAME:
        qb.orderBy("shelter.name", order);
        break;
      case ScheduleSortBy.VISIT_NUMBER:
        qb.orderBy("s.visitNumber", order).addOrderBy("shelter.name", "ASC");
        break;
      case ScheduleSortBy.CREATED_AT:
        qb.orderBy("s.createdAt", order);
        break;
      default:
        // Legado: cronológico de visita.
        qb.orderBy("s.visitDate", "ASC");
    }
    // `orderBy` é um mapa por coluna: só acrescenta o desempate de colunas ainda não usadas,
    // senão o sentido pedido (DESC) seria sobrescrito.
    const used = new Set(Object.keys(qb.expressionMap.orderBys));
    for (const column of ["team.numberTeam", "s.visitNumber", "s.id"]) {
      if (!used.has(column)) qb.addOrderBy(column, "ASC");
    }
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
