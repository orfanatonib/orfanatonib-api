import { MigrationInterface, QueryRunner } from "typeorm";

export class AddSourceLessonToVisitMaterialPage1795050472083 implements MigrationInterface {
    name = 'AddSourceLessonToVisitMaterialPage1795050472083'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`visit_material_pages\` ADD \`sourceLessonId\` varchar(36) NULL`);
        await queryRunner.query(`ALTER TABLE \`visit_material_pages\` ADD UNIQUE INDEX \`IDX_a993e023df855d5a6d0f664114\` (\`sourceLessonId\`)`);
        await queryRunner.query(`CREATE UNIQUE INDEX \`uq_visit_material_source_lesson\` ON \`visit_material_pages\` (\`sourceLessonId\`)`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX \`uq_visit_material_source_lesson\` ON \`visit_material_pages\``);
        await queryRunner.query(`ALTER TABLE \`visit_material_pages\` DROP INDEX \`IDX_a993e023df855d5a6d0f664114\``);
        await queryRunner.query(`ALTER TABLE \`visit_material_pages\` DROP COLUMN \`sourceLessonId\``);
    }

}
