import { MigrationInterface, QueryRunner } from "typeorm";

export class AddImageSectionReview1795125404970 implements MigrationInterface {
    name = 'AddImageSectionReview1795125404970'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`image_sections\` ADD \`reviewStatus\` enum ('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending'`);
        await queryRunner.query(`ALTER TABLE \`image_sections\` ADD \`rejectionReason\` varchar(500) NULL`);
        await queryRunner.query(`ALTER TABLE \`image_sections\` ADD \`reviewedAt\` datetime NULL`);
        await queryRunner.query(`ALTER TABLE \`image_sections\` ADD \`reviewedById\` varchar(36) NULL`);
        // Backfill de dados (não é esquema): o que já estava numa galeria foi aprovado; o resto segue pendente.
        await queryRunner.query(`UPDATE \`image_sections\` SET \`reviewStatus\` = 'approved' WHERE \`pageId\` IS NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`image_sections\` ADD CONSTRAINT \`FK_21b50014ba71cc58a10e098372f\` FOREIGN KEY (\`reviewedById\`) REFERENCES \`users\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`image_sections\` DROP FOREIGN KEY \`FK_21b50014ba71cc58a10e098372f\``);
        await queryRunner.query(`ALTER TABLE \`image_sections\` DROP COLUMN \`reviewedById\``);
        await queryRunner.query(`ALTER TABLE \`image_sections\` DROP COLUMN \`reviewedAt\``);
        await queryRunner.query(`ALTER TABLE \`image_sections\` DROP COLUMN \`rejectionReason\``);
        await queryRunner.query(`ALTER TABLE \`image_sections\` DROP COLUMN \`reviewStatus\``);
    }

}
