import { MigrationInterface, QueryRunner } from "typeorm";

export class AddReviewCommentResolutionMessage1795437175993 implements MigrationInterface {
    name = 'AddReviewCommentResolutionMessage1795437175993'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`content_review_comments\` ADD \`resolutionMessage\` text NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`content_review_comments\` DROP COLUMN \`resolutionMessage\``);
    }

}
