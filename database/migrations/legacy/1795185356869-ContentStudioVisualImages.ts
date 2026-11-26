import { MigrationInterface, QueryRunner } from "typeorm";

export class ContentStudioVisualImages1795185356869 implements MigrationInterface {
    name = 'ContentStudioVisualImages1795185356869'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`content_generation_jobs\` ADD \`progress\` json NULL`);
        await queryRunner.query(`ALTER TABLE \`content_assets\` ADD \`slot\` varchar(60) NULL`);
        await queryRunner.query(`CREATE INDEX \`IDX_adb21b853ae0c0d30c2707fc9f\` ON \`content_assets\` (\`version_id\`, \`slot\`)`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX \`IDX_adb21b853ae0c0d30c2707fc9f\` ON \`content_assets\``);
        await queryRunner.query(`ALTER TABLE \`content_assets\` DROP COLUMN \`slot\``);
        await queryRunner.query(`ALTER TABLE \`content_generation_jobs\` DROP COLUMN \`progress\``);
    }

}
