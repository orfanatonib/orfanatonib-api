import { MigrationInterface, QueryRunner } from "typeorm";

const FLAG_KEY = "integration";
const OLD_NAME = "Integração";
const OLD_DESCRIPTION = "Interruptor do recurso: integração.";
const NEW_NAME = "Integração Feira de Ministério";
const NEW_DESCRIPTION =
  "Integração Feira de Ministério: botão na Área do Membro e nos acolhidos, e a página de registro (admin e líder).";

/**
 * Só o texto muda: a chave `integration` e o estado (ligada/desligada) ficam como
 * estão. Se alguém já editou o nome ou a descrição pela tela de flags, preserva.
 */
export class RenameIntegrationFeatureFlag1795350000000
  implements MigrationInterface
{
  name = "RenameIntegrationFeatureFlag1795350000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      "UPDATE `feature_flags` SET `name` = ? WHERE `key` = ? AND `name` = ?",
      [NEW_NAME, FLAG_KEY, OLD_NAME],
    );
    await queryRunner.query(
      "UPDATE `feature_flags` SET `description` = ? WHERE `key` = ? AND `description` = ?",
      [NEW_DESCRIPTION, FLAG_KEY, OLD_DESCRIPTION],
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      "UPDATE `feature_flags` SET `name` = ? WHERE `key` = ? AND `name` = ?",
      [OLD_NAME, FLAG_KEY, NEW_NAME],
    );
    await queryRunner.query(
      "UPDATE `feature_flags` SET `description` = ? WHERE `key` = ? AND `description` = ?",
      [OLD_DESCRIPTION, FLAG_KEY, NEW_DESCRIPTION],
    );
  }
}
