import { MigrationInterface, QueryRunner } from "typeorm";

export class AddContentReviewDecisions1790910259149 implements MigrationInterface {
    name = 'AddContentReviewDecisions1790910259149'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`content_review_decisions\` (\`id\` varchar(36) NOT NULL, \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`package_id\` varchar(36) NOT NULL, \`stage_id\` varchar(36) NOT NULL, \`version_id\` varchar(36) NOT NULL, \`contentChecksum\` char(64) NOT NULL, \`decision\` enum ('APPROVED', 'CHANGES_REQUESTED') NOT NULL, \`reviewerId\` varchar(36) NOT NULL, \`related_comment_id\` varchar(36) NULL, \`decidedAt\` datetime NOT NULL, INDEX \`IDX_138455fd051d4751236899a932\` (\`version_id\`), INDEX \`IDX_0e1e1126e15a3d5da15b8cf65f\` (\`stage_id\`, \`decidedAt\`), INDEX \`IDX_08bb0c61b5b799b735948e2ccc\` (\`package_id\`, \`decidedAt\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`ALTER TABLE \`content_review_decisions\` ADD CONSTRAINT \`FK_71b5aa16ad1ebdb8df342379519\` FOREIGN KEY (\`stage_id\`) REFERENCES \`content_stages\`(\`id\`) ON DELETE RESTRICT ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`content_review_decisions\` ADD CONSTRAINT \`FK_138455fd051d4751236899a932d\` FOREIGN KEY (\`version_id\`) REFERENCES \`content_versions\`(\`id\`) ON DELETE RESTRICT ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`content_review_decisions\` DROP FOREIGN KEY \`FK_138455fd051d4751236899a932d\``);
        await queryRunner.query(`ALTER TABLE \`content_review_decisions\` DROP FOREIGN KEY \`FK_71b5aa16ad1ebdb8df342379519\``);
        await queryRunner.query(`DROP INDEX \`IDX_08bb0c61b5b799b735948e2ccc\` ON \`content_review_decisions\``);
        await queryRunner.query(`DROP INDEX \`IDX_0e1e1126e15a3d5da15b8cf65f\` ON \`content_review_decisions\``);
        await queryRunner.query(`DROP INDEX \`IDX_138455fd051d4751236899a932\` ON \`content_review_decisions\``);
        await queryRunner.query(`DROP TABLE \`content_review_decisions\``);
    }

}
