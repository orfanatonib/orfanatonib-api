import { Injectable } from "@nestjs/common";
import { DataSource, EntityTarget, FindOptionsWhere, In } from "typeorm";
import type { IdOnlyEntity } from "./route-entity-targets.constants";

/** Consulta de existência por id nas entidades que as rotas dinâmicas apontam. */
@Injectable()
export class RouteExistenceRepository {
  constructor(private readonly dataSource: DataSource) {}

  /** Dentre os ids informados, os que existem na entidade (como texto). */
  async findExistingIds(
    target: EntityTarget<IdOnlyEntity>,
    ids: readonly string[],
  ): Promise<Set<string>> {
    if (ids.length === 0) return new Set();
    const rows = await this.dataSource.getRepository(target).find({
      where: { id: In([...ids]) } as FindOptionsWhere<IdOnlyEntity>,
      select: { id: true },
    });
    return new Set(rows.map((row) => String(row.id)));
  }
}
