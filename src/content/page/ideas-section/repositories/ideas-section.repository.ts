import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { IsNull, Repository } from "typeorm";

import { IdeasPageEntity } from "../../ideas-page/entities/ideas-page.entity";
import { IdeasSectionEntity } from "../entities/ideas-section.entity";
import { IdeasSectionData } from "../types";

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

  async deleteById(id: string): Promise<void> {
    await this.sections.delete({ id });
  }
}
