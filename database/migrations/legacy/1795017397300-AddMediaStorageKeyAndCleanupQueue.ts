import { MigrationInterface, QueryRunner } from "typeorm";

export class AddMediaStorageKeyAndCleanupQueue1795017397300 implements MigrationInterface {
  name = "AddMediaStorageKeyAndCleanupQueue1795017397300";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE \`media_cleanup_queue\` (\`id\` varchar(36) NOT NULL, \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`storageKey\` varchar(512) NOT NULL, \`attempts\` int NOT NULL DEFAULT '0', \`lastError\` text NULL, \`failedAt\` datetime NULL, UNIQUE INDEX \`IDX_cd01d7d9b27c93fb8743b130b5\` (\`storageKey\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `ALTER TABLE \`media_items\` ADD \`storageKey\` varchar(512) NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`media_items\` DROP COLUMN \`storageKey\``,
    );
    await queryRunner.query(
      `DROP INDEX \`IDX_cd01d7d9b27c93fb8743b130b5\` ON \`media_cleanup_queue\``,
    );
    await queryRunner.query(`DROP TABLE \`media_cleanup_queue\``);
  }
}
