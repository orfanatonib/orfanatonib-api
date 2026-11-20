import { MigrationInterface, QueryRunner } from "typeorm";

export class AddVisitMaterialSections1795202395941 implements MigrationInterface {
    name = 'AddVisitMaterialSections1795202395941'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`visit_material_sections\` (\`id\` varchar(36) NOT NULL, \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`page_id\` varchar(36) NOT NULL, \`category\` enum ('BABY', 'CHILD', 'TEEN', 'ADULT') NOT NULL, \`title\` varchar(180) NULL, \`description\` text NULL, \`position\` smallint UNSIGNED NOT NULL DEFAULT '0', UNIQUE INDEX \`uq_visit_material_section_page_category\` (\`page_id\`, \`category\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`ALTER TABLE \`visit_material_sections\` ADD CONSTRAINT \`FK_de9de99be8b515fff505d73339d\` FOREIGN KEY (\`page_id\`) REFERENCES \`visit_material_pages\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`visit_material_sections\` DROP FOREIGN KEY \`FK_de9de99be8b515fff505d73339d\``);
        await queryRunner.query(`DROP INDEX \`uq_visit_material_section_page_category\` ON \`visit_material_sections\``);
        await queryRunner.query(`DROP TABLE \`visit_material_sections\``);
    }

}
