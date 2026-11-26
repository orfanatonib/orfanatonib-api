import { MigrationInterface, QueryRunner } from "typeorm";

export class AddContentPublicationVisitMaterialPage1795120964798 implements MigrationInterface {
    name = 'AddContentPublicationVisitMaterialPage1795120964798'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`content_publications\` ADD \`visit_material_page_id\` varchar(36) NULL`);
        await queryRunner.query(`ALTER TABLE \`content_publications\` CHANGE \`targetType\` \`targetType\` enum ('PDF_EXPORT', 'VISIT_MATERIAL_PAGE') NOT NULL DEFAULT 'PDF_EXPORT'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`content_publications\` CHANGE \`targetType\` \`targetType\` enum ('PDF_EXPORT') NOT NULL DEFAULT 'PDF_EXPORT'`);
        await queryRunner.query(`ALTER TABLE \`content_publications\` DROP COLUMN \`visit_material_page_id\``);
    }

}
