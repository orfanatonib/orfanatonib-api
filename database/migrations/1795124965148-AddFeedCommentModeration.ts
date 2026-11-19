import { MigrationInterface, QueryRunner } from "typeorm";

export class AddFeedCommentModeration1795124965148 implements MigrationInterface {
    name = 'AddFeedCommentModeration1795124965148'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`image_section_comments\` ADD \`requestId\` varchar(36) NULL`);
        await queryRunner.query(`ALTER TABLE \`image_section_comments\` ADD \`status\` enum ('pending', 'approved', 'rejected') NOT NULL DEFAULT 'approved'`);
        await queryRunner.query(`ALTER TABLE \`image_section_comments\` ADD \`moderationReason\` varchar(500) NULL`);
        await queryRunner.query(`ALTER TABLE \`image_section_comments\` ADD \`moderatedById\` varchar(36) NULL`);
        await queryRunner.query(`ALTER TABLE \`image_section_comments\` ADD \`reviewedAt\` datetime NULL`);
        await queryRunner.query(`CREATE UNIQUE INDEX \`UQ_image_section_comments_author_request\` ON \`image_section_comments\` (\`authorId\`, \`requestId\`)`);
        await queryRunner.query(`CREATE INDEX \`IDX_image_section_comments_status_created\` ON \`image_section_comments\` (\`status\`, \`createdAt\`)`);
        await queryRunner.query(`CREATE INDEX \`IDX_image_section_comments_section_status_created\` ON \`image_section_comments\` (\`sectionId\`, \`status\`, \`createdAt\`)`);
        await queryRunner.query(`ALTER TABLE \`image_section_comments\` ADD CONSTRAINT \`FK_a5f4b596ec08ff7356663e3f1d9\` FOREIGN KEY (\`moderatedById\`) REFERENCES \`users\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`image_section_comments\` DROP FOREIGN KEY \`FK_a5f4b596ec08ff7356663e3f1d9\``);
        await queryRunner.query(`DROP INDEX \`IDX_image_section_comments_section_status_created\` ON \`image_section_comments\``);
        await queryRunner.query(`DROP INDEX \`IDX_image_section_comments_status_created\` ON \`image_section_comments\``);
        await queryRunner.query(`DROP INDEX \`UQ_image_section_comments_author_request\` ON \`image_section_comments\``);
        await queryRunner.query(`ALTER TABLE \`image_section_comments\` DROP COLUMN \`reviewedAt\``);
        await queryRunner.query(`ALTER TABLE \`image_section_comments\` DROP COLUMN \`moderatedById\``);
        await queryRunner.query(`ALTER TABLE \`image_section_comments\` DROP COLUMN \`moderationReason\``);
        await queryRunner.query(`ALTER TABLE \`image_section_comments\` DROP COLUMN \`status\``);
        await queryRunner.query(`ALTER TABLE \`image_section_comments\` DROP COLUMN \`requestId\``);
    }

}
