import { MigrationInterface, QueryRunner } from "typeorm";

export class AddFeatureFlagProtectedVersion1795264714158 implements MigrationInterface {
    name = 'AddFeatureFlagProtectedVersion1795264714158'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`feature_flags\` DROP COLUMN \`environment\``);
        await queryRunner.query(`ALTER TABLE \`feature_flags\` ADD \`protected\` tinyint NOT NULL DEFAULT 0`);
        await queryRunner.query(`ALTER TABLE \`feature_flags\` ADD \`version\` int NOT NULL DEFAULT '1'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`feature_flags\` DROP COLUMN \`version\``);
        await queryRunner.query(`ALTER TABLE \`feature_flags\` DROP COLUMN \`protected\``);
        await queryRunner.query(`ALTER TABLE \`feature_flags\` ADD \`environment\` varchar(50) NULL`);
    }

}
