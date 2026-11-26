import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * MIGRATION DE DADOS (autorizada pelo solicitante; UPDATE puro, não sai de
 * `migration:generate`). Decisão de produto: página de ideias é SEMPRE privada.
 * O código novo já ignora a coluna e nunca devolve a rota a visitante; aqui os
 * dados legados são normalizados para `public = 0`.
 *
 * Idempotente: só toca linhas ainda públicas; rodar de novo não altera nada.
 * Não mexe em nenhuma outra entidade: as rotas são filtradas por
 * `entityType = 'IdeasPage'` (valor de `MediaTargetType.IdeasPage`).
 */
export class ForceIdeasPagesPrivate1795360000000 implements MigrationInterface {
  name = "ForceIdeasPagesPrivate1795360000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      "UPDATE `ideas_pages` SET `public` = 0 WHERE `public` <> 0",
    );
    await queryRunner.query(
      "UPDATE `routes` SET `public` = 0 WHERE `entityType` = ? AND `public` <> 0",
      ["IdeasPage"],
    );
  }

  /**
   * Sem reversão: o estado anterior (quais páginas estavam públicas) não é
   * guardado e a regra de negócio agora é "sempre privada"; restaurar `public = 1`
   * seria inventar dado. Reverter a migration não altera os dados.
   */
  public async down(): Promise<void> {
    // intencionalmente vazio
  }
}
