import { Injectable } from "@nestjs/common";
import { DataSource } from "typeorm";

/**
 * Execução da listagem de perfis (SQL montado pelo serviço com colunas e direção
 * de listas fixas e valores SEMPRE parametrizados). A persistência fica aqui —
 * o serviço não conhece o `DataSource`.
 */
@Injectable()
export class ProfilesQueryRepository {
  constructor(private readonly dataSource: DataSource) {}

  query<T>(
    sql: string,
    params: readonly (string | number | Date)[],
  ): Promise<T> {
    return this.dataSource.query<T>(sql, [...params]);
  }
}
