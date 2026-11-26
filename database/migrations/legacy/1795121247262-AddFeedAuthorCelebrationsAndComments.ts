import { MigrationInterface, QueryRunner } from "typeorm";

export class AddFeedAuthorCelebrationsAndComments1795121247262 implements MigrationInterface {
    name = 'AddFeedAuthorCelebrationsAndComments1795121247262'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`image_section_celebrations\` (\`id\` varchar(36) NOT NULL, \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`sectionId\` varchar(36) NOT NULL, \`userId\` varchar(36) NOT NULL, UNIQUE INDEX \`UQ_image_section_celebrations_section_user\` (\`sectionId\`, \`userId\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`image_section_comments\` (\`id\` varchar(36) NOT NULL, \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`sectionId\` varchar(36) NOT NULL, \`authorId\` varchar(36) NOT NULL, \`content\` varchar(500) NOT NULL, INDEX \`IDX_image_section_comments_section_created\` (\`sectionId\`, \`createdAt\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`ALTER TABLE \`image_sections\` ADD \`authorId\` varchar(36) NULL`);
        await queryRunner.query(`ALTER TABLE \`image_sections\` ADD CONSTRAINT \`FK_e530e3c1c69be7f533a8d23c2cd\` FOREIGN KEY (\`authorId\`) REFERENCES \`users\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`image_section_celebrations\` ADD CONSTRAINT \`FK_a2f828df71e20d4ea8be2f32b9d\` FOREIGN KEY (\`sectionId\`) REFERENCES \`image_sections\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`image_section_celebrations\` ADD CONSTRAINT \`FK_79e20bc6c9c1cd3b60dd6ef11fe\` FOREIGN KEY (\`userId\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`image_section_comments\` ADD CONSTRAINT \`FK_02d5fedb1b69014bb3b8d7528ed\` FOREIGN KEY (\`sectionId\`) REFERENCES \`image_sections\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`image_section_comments\` ADD CONSTRAINT \`FK_2d7a6f62e76c2687ae8ac733b22\` FOREIGN KEY (\`authorId\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`image_section_comments\` DROP FOREIGN KEY \`FK_2d7a6f62e76c2687ae8ac733b22\``);
        await queryRunner.query(`ALTER TABLE \`image_section_comments\` DROP FOREIGN KEY \`FK_02d5fedb1b69014bb3b8d7528ed\``);
        await queryRunner.query(`ALTER TABLE \`image_section_celebrations\` DROP FOREIGN KEY \`FK_79e20bc6c9c1cd3b60dd6ef11fe\``);
        await queryRunner.query(`ALTER TABLE \`image_section_celebrations\` DROP FOREIGN KEY \`FK_a2f828df71e20d4ea8be2f32b9d\``);
        await queryRunner.query(`ALTER TABLE \`image_sections\` DROP FOREIGN KEY \`FK_e530e3c1c69be7f533a8d23c2cd\``);
        await queryRunner.query(`ALTER TABLE \`image_sections\` DROP COLUMN \`authorId\``);
        await queryRunner.query(`DROP INDEX \`IDX_image_section_comments_section_created\` ON \`image_section_comments\``);
        await queryRunner.query(`DROP TABLE \`image_section_comments\``);
        await queryRunner.query(`DROP INDEX \`UQ_image_section_celebrations_section_user\` ON \`image_section_celebrations\``);
        await queryRunner.query(`DROP TABLE \`image_section_celebrations\``);
    }

}
