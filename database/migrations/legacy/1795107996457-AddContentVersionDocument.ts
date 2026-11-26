import { MigrationInterface, QueryRunner } from "typeorm";

export class AddContentVersionDocument1795107996457 implements MigrationInterface {
    name = 'AddContentVersionDocument1795107996457'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`content_versions\` ADD \`contentDocument\` json NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`content_versions\` DROP COLUMN \`contentDocument\``);
    }

}
