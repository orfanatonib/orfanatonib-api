import {
  Injectable,
  NotFoundException,
  ConflictException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { DataSource, Repository, SelectQueryBuilder } from "typeorm";
import { PagelaEntity } from "./entities/pagela.entity";
import { ShelteredEntity } from "src/shelter/sheltered/entities/sheltered.entity";
import { MemberProfileEntity } from "src/shelter/member-profile/entities/member-profile.entity/member-profile.entity";
import { PagelaFiltersDto } from "./dto/pagela-filters.dto";

@Injectable()
export class PagelasRepository {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(PagelaEntity)
    private readonly repo: Repository<PagelaEntity>,
    @InjectRepository(ShelteredEntity)
    private readonly shelteredRepo: Repository<ShelteredEntity>,
    @InjectRepository(MemberProfileEntity)
    private readonly memberRepo: Repository<MemberProfileEntity>,
  ) {}

  private baseQB(): SelectQueryBuilder<PagelaEntity> {
    return this.repo
      .createQueryBuilder("p")
      .leftJoin("p.sheltered", "sheltered")
      .addSelect(["sheltered.id", "sheltered.name"])
      .leftJoin("p.member", "member")
      .addSelect(["member.id"])
      .leftJoin("member.user", "memberUser")
      .addSelect(["memberUser.id", "memberUser.name"]);
  }

  private applyFilters(
    qb: SelectQueryBuilder<PagelaEntity>,
    f?: PagelaFiltersDto,
    shelterIds?: readonly string[],
  ) {
    if (shelterIds) {
      if (shelterIds.length === 0) {
        qb.andWhere("1 = 0");
      } else {
        qb.leftJoin("sheltered.shelter", "scopeShelter").andWhere(
          "scopeShelter.id IN (:...scopeShelterIds)",
          { scopeShelterIds: [...shelterIds] },
        );
      }
    }
    if (!f) return qb;

    if (f.shelteredId) {
      qb.andWhere("sheltered.id = :shelteredId", {
        shelteredId: f.shelteredId,
      });
    }

    if (f.year !== undefined) {
      qb.andWhere("p.year = :year", { year: f.year });
    }

    if (f.visit !== undefined) {
      qb.andWhere("p.visit = :visit", { visit: f.visit });
    }

    if (f.present !== undefined) {
      qb.andWhere("p.present = :present", { present: f.present });
    }

    if (f.searchString?.trim()) {
      const like = `%${f.searchString.trim()}%`;
      qb.andWhere(
        `(
          CAST(p.visit AS CHAR) LIKE :searchStringRaw OR
          CAST(p.year AS CHAR) LIKE :searchStringRaw OR
          LOWER(COALESCE(p.notes, '')) LIKE LOWER(:searchString) OR
          LOWER(COALESCE(memberUser.name, '')) LIKE LOWER(:searchString)
        )`,
        { searchString: like, searchStringRaw: `%${f.searchString.trim()}%` },
      );
    }

    return qb;
  }

  async findAllSimple(
    filters?: PagelaFiltersDto,
    shelterIds?: readonly string[],
  ): Promise<PagelaEntity[]> {
    const qb = this.applyFilters(this.baseQB(), filters, shelterIds)
      .orderBy("p.year", "DESC")
      .addOrderBy("p.visit", "DESC")
      .addOrderBy("sheltered.name", "ASC");

    return qb.getMany();
  }

  async findAllPaginated(
    filters: PagelaFiltersDto | undefined,
    page: number,
    limit: number,
    shelterIds?: readonly string[],
  ): Promise<{ items: PagelaEntity[]; total: number }> {
    const qb = this.applyFilters(this.baseQB(), filters, shelterIds);
    qb.orderBy("p.year", "DESC")
      .addOrderBy("p.visit", "DESC")
      .addOrderBy("sheltered.name", "ASC");

    const [items, total] = await qb
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();
    return { items, total };
  }

  /** Abrigo do acolhido (null se o acolhido não existe ou não tem abrigo). */
  async findShelterIdOfSheltered(shelteredId: string): Promise<string | null> {
    const sheltered = await this.shelteredRepo.findOne({
      where: { id: shelteredId },
      relations: { shelter: true },
    });
    return sheltered?.shelter?.id ?? null;
  }

  /** Acolhido e abrigo a que a pagela pertence (null se a pagela não existe). */
  async findScopeOfPagela(
    id: string,
  ): Promise<{ shelteredId: string; shelterId: string | null } | null> {
    const pagela = await this.repo.findOne({
      where: { id },
      relations: { sheltered: { shelter: true } },
    });
    if (!pagela?.sheltered) return null;
    return {
      shelteredId: pagela.sheltered.id,
      shelterId: pagela.sheltered.shelter?.id ?? null,
    };
  }

  async findOneOrFail(id: string): Promise<PagelaEntity> {
    const qb = this.baseQB().where("p.id = :id", { id });
    const item = await qb.getOne();
    if (!item) throw new NotFoundException("Pagela not found");
    return item;
  }

  async findOneByChildYearVisitOrNull(
    shelteredId: string,
    year: number,
    visit: number,
  ): Promise<PagelaEntity | null> {
    return this.repo.findOne({
      where: { sheltered: { id: shelteredId }, year, visit },
      relations: { sheltered: true, member: true },
    });
  }

  async createOne(data: {
    shelteredId: string;
    memberProfileId: string;
    referenceDate: string;
    year: number;
    visit: number;
    present: boolean;
    notes?: string | null;
  }): Promise<PagelaEntity> {
    return this.dataSource.transaction(async (manager) => {
      const txPagela = manager.withRepository(this.repo);
      const txSheltered = manager.withRepository(this.shelteredRepo);
      const txMember = manager.withRepository(this.memberRepo);

      const [sheltered, member] = await Promise.all([
        txSheltered.findOne({ where: { id: data.shelteredId } }),
        txMember.findOne({ where: { id: data.memberProfileId } }),
      ]);
      if (!sheltered) throw new NotFoundException("Sheltered not found");
      if (!member) throw new NotFoundException("MemberProfile not found");

      const existing = await txPagela.findOne({
        where: {
          sheltered: { id: data.shelteredId },
          year: data.year,
          visit: data.visit,
        },
      });
      if (existing) {
        throw new ConflictException(
          "Pagela already exists for this sheltered in this visit/year",
        );
      }

      const entity = txPagela.create({
        sheltered,
        member,
        referenceDate: data.referenceDate,
        year: data.year,
        visit: data.visit,
        present: data.present,
        notes: data.notes ?? null,
      });

      try {
        return await txPagela.save(entity);
      } catch (e: unknown) {
        if ((e as { code?: string } | null)?.code === "ER_DUP_ENTRY") {
          throw new ConflictException(
            "Já existe Pagela para este abrigado nesta visita/ano",
          );
        }
        throw e;
      }
    });
  }

  async updateOne(
    id: string,
    data: Partial<PagelaEntity>,
  ): Promise<PagelaEntity> {
    return this.dataSource.transaction(async (manager) => {
      const txPagela = manager.withRepository(this.repo);
      const entity = await txPagela.findOne({
        where: { id },
        relations: { sheltered: true, member: true },
      });
      if (!entity) throw new NotFoundException("Pagela not found");

      Object.assign(entity, data);
      try {
        return await txPagela.save(entity);
      } catch (e: unknown) {
        if ((e as { code?: string } | null)?.code === "ER_DUP_ENTRY") {
          throw new ConflictException(
            "Pagela already exists for this sheltered in this visit/year",
          );
        }
        throw e;
      }
    });
  }

  async remove(id: string): Promise<void> {
    const exists = await this.repo.findOne({ where: { id } });
    if (!exists) return;
    await this.repo.delete(id);
  }
}
