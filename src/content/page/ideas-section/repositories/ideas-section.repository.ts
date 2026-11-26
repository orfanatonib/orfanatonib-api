import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { IsNull, Repository } from "typeorm";

import { IdeasPageEntity } from "../../ideas-page/entities/ideas-page.entity";
import { IdeasSectionEntity } from "../entities/ideas-section.entity";
import { IdeasSectionData } from "../types";
import { IdeasSectionListQueryDto } from "../dto/ideas-section-list-query.dto";
import { IdeasSectionSortBy } from "../enums/ideas-section-sort-by.enum";
import { SortOrder } from "src/shared/enums/sort-order.enum";
import { MediaTargetType } from "src/shared/media/media-target-type.enum";
import {
  createdRange,
  escapeLike,
  isPaginated,
  normalizeSearch,
  pageWindow,
} from "src/shared/list-query/list-query.util";

/**
 * Único ponto do módulo que fala TypeORM.
 *
 * A versão anterior **estendia** `Repository<IdeasSectionEntity>`, o que
 * entregava `find`, `save`, `merge` e `createQueryBuilder` a qualquer serviço
 * que a injetasse — e foi exatamente assim que a regra de atualização acabou
 * espalhada por três serviços.
 */
@Injectable()
export class IdeasSectionRepository {
  constructor(
    @InjectRepository(IdeasSectionEntity)
    private readonly sections: Repository<IdeasSectionEntity>,
    @InjectRepository(IdeasPageEntity)
    private readonly pages: Repository<IdeasPageEntity>,
  ) {}

  /** Seção com autor e página, para as regras que dependem do vínculo. */
  async findById(id: string): Promise<IdeasSectionEntity | null> {
    return this.sections.findOne({
      where: { id },
      relations: ["user", "page"],
    });
  }

  /** Quantas ideias aguardam o admin (mesmo critério de `findUnattached`). */
  async countUnattached(): Promise<number> {
    return this.sections.count({ where: { page: IsNull() } });
  }

  /**
   * Seções ainda não vinculadas a nenhuma página — o acervo que a tela de
   * ideias compartilhadas administra.
   */
  async findUnattached(): Promise<IdeasSectionEntity[]> {
    return this.sections.find({
      where: { page: IsNull() },
      relations: ["user"],
      order: { createdAt: "DESC" },
    });
  }

  /**
   * Fila filtrada, ordenada e (com `page`) recortada no banco.
   * Sem `sortBy` e sem `page` mantém a ordem legada (mais recentes primeiro).
   */
  async findUnattachedFiltered(
    query: IdeasSectionListQueryDto = {},
  ): Promise<{ items: IdeasSectionEntity[]; total: number }> {
    const qb = this.sections
      .createQueryBuilder("s")
      .leftJoinAndSelect("s.user", "user")
      .leftJoin("s.page", "page")
      .where("page.id IS NULL");

    const search = normalizeSearch(query.search);
    if (search) {
      qb.andWhere(
        "(s.title LIKE :search ESCAPE '\\\\' OR s.description LIKE :search ESCAPE '\\\\' OR user.name LIKE :search ESCAPE '\\\\' OR user.email LIKE :search ESCAPE '\\\\')",
        { search: `%${escapeLike(search)}%` },
      );
    }
    if (query.mediaType) {
      qb.andWhere(
        "EXISTS (SELECT 1 FROM media_items mi WHERE mi.targetId = s.id AND mi.targetType = :mediaTarget AND mi.mediaType = :mediaType)",
        {
          mediaTarget: MediaTargetType.IdeasSection,
          mediaType: query.mediaType,
        },
      );
    }
    const { from, to } = createdRange(query);
    if (from) qb.andWhere("s.createdAt >= :createdFrom", { createdFrom: from });
    if (to) qb.andWhere("s.createdAt <= :createdTo", { createdTo: to });

    const column = query.sortBy ?? IdeasSectionSortBy.CREATED_AT;
    qb.orderBy(`s.${column}`, query.order ?? SortOrder.DESC).addOrderBy(
      "s.id",
      "ASC",
    );
    if (isPaginated(query)) {
      const { skip, take } = pageWindow(query);
      qb.skip(skip).take(take);
    }
    const [items, total] = await qb.getManyAndCount();
    return { items, total };
  }

  async findPageById(id: string): Promise<IdeasPageEntity | null> {
    return this.pages.findOne({ where: { id } });
  }

  /** Cria a seção sem página, atribuída a quem a enviou. */
  async createUnattached(
    data: IdeasSectionData,
    userId: string,
  ): Promise<IdeasSectionEntity> {
    const section = this.sections.create({
      ...data,
      page: undefined,
      user: { id: userId },
    });

    return this.sections.save(section);
  }

  /**
   * Atualiza a seção **no lugar**.
   *
   * O método anterior montava um objeto sem `id` e chamava `save`, o que o
   * TypeORM trata como inserção: cada PATCH criava uma seção nova, deixava a
   * original órfã e ainda mudava o id devolvido ao cliente.
   */
  async updateData(
    id: string,
    data: IdeasSectionData,
  ): Promise<IdeasSectionEntity> {
    await this.sections.update(id, data);
    const updated = await this.findById(id);
    // O update acabou de gravar a linha; a releitura só recompõe as relações.
    return updated as IdeasSectionEntity;
  }

  /** Vincula a seção à página, preservando o restante dos campos. */
  async attachToPage(
    id: string,
    data: IdeasSectionData,
    page: IdeasPageEntity,
  ): Promise<IdeasSectionEntity> {
    await this.sections.save({ id, ...data, page });
    const attached = await this.findById(id);
    // O save acabou de gravar a linha; a releitura só recompõe as relações.
    return attached as IdeasSectionEntity;
  }

  /** Desfaz o vínculo com a página e restaura os campos de antes (compensação do attach). */
  async restoreUnattached(id: string, data: IdeasSectionData): Promise<void> {
    await this.sections.update(id, { ...data, page: null as never });
  }

  async deleteById(id: string): Promise<void> {
    await this.sections.delete({ id });
  }
}
