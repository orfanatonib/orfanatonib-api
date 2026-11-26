import { MigrationInterface, QueryRunner } from "typeorm";

export class AddAiProviderSettings1795106111279 implements MigrationInterface {
    name = 'AddAiProviderSettings1795106111279'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX \`IDX_a993e023df855d5a6d0f664114\` ON \`visit_material_pages\``);
        await queryRunner.query(`CREATE TABLE \`ai_provider_settings\` (\`provider\` varchar(50) NOT NULL, \`settings\` text NOT NULL, \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), PRIMARY KEY (\`provider\`)) ENGINE=InnoDB`);
        await queryRunner.query(`ALTER TABLE \`feature_flags\` DROP COLUMN \`environment\``);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`feature_flags\` ADD \`environment\` varchar(50) NULL`);
        await queryRunner.query(`DROP TABLE \`ai_provider_settings\``);
        await queryRunner.query(`CREATE UNIQUE INDEX \`IDX_a993e023df855d5a6d0f664114\` ON \`visit_material_pages\` (\`sourceLessonId\`)`);
    }

}
