import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { ShelterScheduleEntity } from "src/shelter/schedule/entities/shelter-schedule.entity";
import { PagelaEntity } from "src/shelter/pagela/entities/pagela.entity";
import { LeaderProfileEntity } from "src/shelter/leader-profile/entities/leader-profile.entity/leader-profile.entity";
import { ShelteredEntity } from "src/shelter/sheltered/entities/sheltered.entity";
import {
  PendingPagelaGroup,
  PendingVisitReport,
  ReminderRecipient,
} from "../types";

/**
 * As consultas que sustentam os lembretes. Ficam no domínio de abrigo porque
 * é aqui que as tabelas de visita, pagela e equipe vivem.
 */
@Injectable()
export class PendingWorkRepository {
  constructor(
    @InjectRepository(ShelterScheduleEntity)
    private readonly scheduleRepo: Repository<ShelterScheduleEntity>,
    @InjectRepository(PagelaEntity)
    private readonly pagelaRepo: Repository<PagelaEntity>,
    @InjectRepository(ShelteredEntity)
    private readonly shelteredRepo: Repository<ShelteredEntity>,
    @InjectRepository(LeaderProfileEntity)
    private readonly leaderRepo: Repository<LeaderProfileEntity>,
  ) {}

  /**
   * Visitas cuja data já passou (com carência) e que não têm relatório.
   * `visitDate` é texto no schema, então a comparação é por string ISO.
   */
  async findVisitsWithoutReport(
    dueBefore: string,
    notBefore: string,
  ): Promise<PendingVisitReport[]> {
    const rows = await this.scheduleRepo
      .createQueryBuilder("schedule")
      .innerJoin("schedule.team", "team")
      .innerJoin("team.shelter", "shelter")
      .leftJoin("visit_reports", "report", "report.schedule_id = schedule.id")
      .where("report.id IS NULL")
      .andWhere("schedule.visitDate IS NOT NULL")
      .andWhere("schedule.visitDate <= :dueBefore", { dueBefore })
      .andWhere("schedule.visitDate >= :notBefore", { notBefore })
      .select([
        "schedule.id AS scheduleId",
        "schedule.visitNumber AS visitNumber",
        "schedule.visitDate AS visitDate",
        "shelter.id AS shelterId",
        "shelter.name AS shelterName",
        "team.id AS teamId",
      ])
      .getRawMany<PendingVisitReport>();

    return rows;
  }

  /**
   * Acolhidos ativos sem pagela lançada para a visita da vez, agrupados por
   * abrigo. Só conta abrigo que já teve a visita acontecer.
   */
  async findShelteredWithoutPagela(
    year: number,
    visit: number,
  ): Promise<PendingPagelaGroup[]> {
    const rows = await this.shelteredRepo
      .createQueryBuilder("sheltered")
      .innerJoin("sheltered.shelter", "shelter")
      .innerJoin("shelter.teams", "team")
      .leftJoin(
        "pagelas",
        "pagela",
        "pagela.sheltered_id = sheltered.id AND pagela.year = :year AND pagela.visit = :visit",
        { year, visit },
      )
      .where("pagela.id IS NULL")
      .andWhere("sheltered.active = :active", { active: true })
      .groupBy("shelter.id")
      .addGroupBy("shelter.name")
      .addGroupBy("team.id")
      .select([
        "shelter.id AS shelterId",
        "shelter.name AS shelterName",
        "team.id AS teamId",
        "COUNT(sheltered.id) AS pendingCount",
      ])
      .getRawMany<{
        shelterId: string;
        shelterName: string;
        teamId: string;
        pendingCount: string;
      }>();

    return rows.map((row) => ({
      shelterId: row.shelterId,
      shelterName: row.shelterName,
      teamId: row.teamId,
      year,
      visit,
      pendingCount: Number(row.pendingCount),
    }));
  }

  /** Líderes ativos da equipe — são eles que recebem a cobrança. */
  async findTeamLeaders(teamId: string): Promise<ReminderRecipient[]> {
    const rows = await this.leaderRepo
      .createQueryBuilder("leader")
      .innerJoin("leader.teams", "team")
      .innerJoin("leader.user", "user")
      .where("team.id = :teamId", { teamId })
      .andWhere("leader.active = :active", { active: true })
      .andWhere("user.active = :userActive", { userActive: true })
      .select(["user.id AS userId", "user.name AS name", "user.email AS email"])
      .getRawMany<ReminderRecipient>();

    return rows.filter((row) => !!row.email);
  }

  /** Visita mais recente já realizada, base do lembrete de pagela. */
  async findLatestPastVisit(
    dueBefore: string,
  ): Promise<{ year: number; visit: number } | null> {
    const row = await this.scheduleRepo
      .createQueryBuilder("schedule")
      .where("schedule.visitDate IS NOT NULL")
      .andWhere("schedule.visitDate <= :dueBefore", { dueBefore })
      .orderBy("schedule.visitDate", "DESC")
      .select([
        "schedule.visitNumber AS visit",
        "YEAR(schedule.visitDate) AS year",
      ])
      .getRawOne<{ year: number; visit: number }>();

    return row ? { year: Number(row.year), visit: Number(row.visit) } : null;
  }

  /** Alguma pagela já foi lançada nesta visita? Sem nenhuma, não cobra. */
  async hasAnyPagela(year: number, visit: number): Promise<boolean> {
    return (await this.pagelaRepo.countBy({ year, visit })) > 0;
  }
}
