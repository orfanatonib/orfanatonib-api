import { Injectable } from "@nestjs/common";
import { InjectDataSource } from "@nestjs/typeorm";
import { DataSource } from "typeorm";

import {
  MEDIA_KEY_REFERENCE_COLUMNS,
  MEDIA_URL_REFERENCE_COLUMNS,
} from "./media-storage.constants";
import type { MediaReferenceColumn } from "./media-storage.types";

/** Pergunta ao banco se alguém ainda referencia um arquivo do bucket, em qualquer tabela. */
@Injectable()
export class MediaReferenceRepository {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async isReferenced(url: string): Promise<boolean> {
    const media: unknown[] = await this.dataSource.query(
      "SELECT 1 AS hit FROM media_items WHERE url = ? LIMIT 1",
      [url],
    );
    if (media.length > 0) return true;

    const tables = await this.existingTables();
    for (const { table, column } of this.present(
      MEDIA_URL_REFERENCE_COLUMNS,
      tables,
    )) {
      const rows: unknown[] = await this.dataSource.query(
        `SELECT 1 AS hit FROM \`${table}\` WHERE \`${column}\` = ? LIMIT 1`,
        [url],
      );
      if (rows.length > 0) return true;
    }

    // Colunas de chave guardam o caminho do objeto: a URL termina em `/<chave>`.
    for (const { table, column } of this.present(
      MEDIA_KEY_REFERENCE_COLUMNS,
      tables,
    )) {
      const rows: unknown[] = await this.dataSource.query(
        `SELECT 1 AS hit FROM \`${table}\` WHERE \`${column}\` = ? OR RIGHT(?, CHAR_LENGTH(\`${column}\`) + 1) = CONCAT('/', \`${column}\`) LIMIT 1`,
        [url, url],
      );
      if (rows.length > 0) return true;
    }
    return false;
  }

  /** URLs ou chaves guardadas fora de `media_items` (capas, imagens de rota, arquivos do Estúdio). */
  async findAllReferences(): Promise<string[]> {
    const tables = await this.existingTables();
    const columns = this.present(
      [...MEDIA_URL_REFERENCE_COLUMNS, ...MEDIA_KEY_REFERENCE_COLUMNS],
      tables,
    );
    const found: string[] = [];
    for (const { table, column } of columns) {
      const rows: Array<{ value: string }> = await this.dataSource.query(
        `SELECT \`${column}\` AS value FROM \`${table}\` WHERE \`${column}\` IS NOT NULL AND \`${column}\` <> ''`,
      );
      found.push(...rows.map((row) => row.value));
    }
    return found;
  }

  /** Entidade sem migration no ambiente (módulo não ativado) não tem tabela nem referência. */
  private async existingTables(): Promise<Set<string>> {
    const rows: Array<{ name: string }> = await this.dataSource.query(
      "SELECT table_name AS name FROM information_schema.tables WHERE table_schema = DATABASE()",
    );
    return new Set(rows.map((row) => row.name));
  }

  private present(
    columns: ReadonlyArray<MediaReferenceColumn>,
    tables: ReadonlySet<string>,
  ): ReadonlyArray<MediaReferenceColumn> {
    return columns.filter((item) => tables.has(item.table));
  }
}
