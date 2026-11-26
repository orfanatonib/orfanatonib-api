import { Injectable, NotFoundException } from "@nestjs/common";
import { Repository, DataSource, In } from "typeorm";
import { SortOrder } from "src/shared/enums/sort-order.enum";
import {
  createdRange,
  escapeLike,
  isPaginated,
  normalizeSearch,
  pageWindow,
} from "src/shared/list-query/list-query.util";
import { QueryVisitReportDto } from "./dto/query-visit-report.dto";
import { VisitReportSortBy } from "./enums/visit-report-sort-by.enum";
import { TeamEntity } from "src/shelter/team/entities/team.entity";
import { VisitReportEntity } from "./entities/visit-report.entity";
import { LeaderProfileEntity } from "src/shelter/leader-profile/entities/leader-profile.entity/leader-profile.entity";

const FULL_RELATIONS = [
  "schedule",
  "schedule.team",
  "schedule.team.shelter",
  "schedule.team.shelter.address",
  "schedule.team.leaders",
  "schedule.team.leaders.user",
];

/** Quem lista: admin vê tudo; líder só as equipes que lidera; qualquer outro, nada. */
export interface VisitReportListActor {
  role: "admin" | "leader" | null;
  userId: string | null;
}

const SORT_COLUMNS: Record<VisitReportSortBy, string> = {
  [VisitReportSortBy.CREATED_AT]: "r.createdAt",
  [VisitReportSortBy.VISIT_DATE]: "s.visitDate",
  [VisitReportSortBy.VISIT_NUMBER]: "s.visitNumber",
  [VisitReportSortBy.SHELTER]: "sh.name",
  [VisitReportSortBy.TEAM]: "t.numberTeam",
};

@Injectable()
export class VisitReportRepository {
  private readonly repo: Repository<VisitReportEntity>;

  constructor(private readonly ds: DataSource) {
    this.repo = ds.getRepository(VisitReportEntity);
  }

  async findAll(): Promise<VisitReportEntity[]> {
    return this.repo.find({
      order: { createdAt: "DESC" },
      relations: FULL_RELATIONS,
    });
  }

  /**
   * Filtros, escopo do ator, ordenação e (com `page`) recorte, tudo no banco. Primeiro acha os ids
   * da janela; depois carrega as relações só deles (sem N+1 e sem recortar junções de líderes).
   */
  async findFiltered(
    actor: VisitReportListActor,
    query: QueryVisitReportDto = {},
  ): Promise<{ items: VisitReportEntity[]; total: number }> {
    if (!actor.role || (actor.role === "leader" && !actor.userId)) {
      return { items: [], total: 0 };
    }

    const qb = this.repo
      .createQueryBuilder("r")
      .innerJoin("r.schedule", "s")
      .innerJoin("s.team", "t")
      .innerJoin("t.shelter", "sh");

    if (actor.role === "leader") {
      const ledTeams = this.ds
        .getRepository(TeamEntity)
        .createQueryBuilder("lt")
        .select("lt.id")
        .innerJoin("lt.leaders", "ll")
        .innerJoin("ll.user", "lu")
        .where("lu.id = :leaderUserId");
      qb.andWhere(`t.id IN (${ledTeams.getQuery()})`, {
        leaderUserId: actor.userId,
      });
    }

    if (query.scheduleId)
      qb.andWhere("s.id = :scheduleId", { scheduleId: query.scheduleId });
    if (query.teamId) qb.andWhere("t.id = :teamId", { teamId: query.teamId });
    if (query.shelterId)
      qb.andWhere("sh.id = :shelterId", { shelterId: query.shelterId });
    if (query.visitFrom)
      qb.andWhere("s.visitDate >= :visitFrom", { visitFrom: query.visitFrom });
    if (query.visitTo)
      qb.andWhere("s.visitDate <= :visitTo", { visitTo: query.visitTo });

    const search = normalizeSearch(query.search);
    if (search) {
      qb.andWhere(
        `(sh.name LIKE :search ESCAPE '\\\\'
          OR CONCAT('Equipe ', t.numberTeam) LIKE :search ESCAPE '\\\\'
          OR r.observation LIKE :search ESCAPE '\\\\'
          OR s.lessonContent LIKE :search ESCAPE '\\\\'
          OR CAST(s.visitNumber AS CHAR) LIKE :search ESCAPE '\\\\')`,
        { search: `%${escapeLike(search)}%` },
      );
    }

    const { from, to } = createdRange(query);
    if (from) qb.andWhere("r.createdAt >= :createdFrom", { createdFrom: from });
    if (to) qb.andWhere("r.createdAt <= :createdTo", { createdTo: to });

    const column = SORT_COLUMNS[query.sortBy ?? VisitReportSortBy.CREATED_AT];
    qb.orderBy(column, query.order ?? SortOrder.DESC).addOrderBy("r.id", "ASC");

    const total = await qb.getCount();
    if (total === 0) return { items: [], total };

    if (isPaginated(query)) {
      const { skip, take } = pageWindow(query);
      qb.offset(skip).limit(take);
    }
    const rows = await qb.select("r.id", "id").getRawMany<{ id: string }>();
    const ids = rows.map((row) => row.id);
    if (ids.length === 0) return { items: [], total };

    const loaded = await this.repo.find({
      where: { id: In(ids) },
      relations: FULL_RELATIONS,
    });
    const byId = new Map(loaded.map((entity) => [entity.id, entity]));
    const items = ids
      .map((id) => byId.get(id))
      .filter((entity): entity is VisitReportEntity => Boolean(entity));
    return { items, total };
  }

  async findById(id: string): Promise<VisitReportEntity | null> {
    return this.repo.findOne({
      where: { id },
      relations: FULL_RELATIONS,
    });
  }

  async findByScheduleId(
    scheduleId: string,
  ): Promise<VisitReportEntity | null> {
    return this.repo.findOne({
      where: { schedule: { id: scheduleId } },
      relations: FULL_RELATIONS,
    });
  }

  async findByTeamId(teamId: string): Promise<VisitReportEntity[]> {
    return this.repo.find({
      where: { schedule: { team: { id: teamId } } },
      relations: FULL_RELATIONS,
      order: { createdAt: "DESC" },
    });
  }

  async findByShelterId(shelterId: string): Promise<VisitReportEntity[]> {
    return this.repo.find({
      where: { schedule: { team: { shelter: { id: shelterId } } } },
      relations: FULL_RELATIONS,
      order: { createdAt: "DESC" },
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
      order: { createdAt: "DESC" },
    });
  }

  /** O usuário lidera a equipe? (escopo de criação do líder) */
  async isLeaderOfTeam(userId: string, teamId: string): Promise<boolean> {
    return this.ds.getRepository(LeaderProfileEntity).exists({
      where: { user: { id: userId }, teams: { id: teamId } },
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
    if (!entity) throw new NotFoundException("Visit report not found");
    await this.repo.remove(entity);
  }
}
