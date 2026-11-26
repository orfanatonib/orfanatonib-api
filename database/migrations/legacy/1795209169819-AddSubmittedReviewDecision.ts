import { MigrationInterface, QueryRunner } from "typeorm";

export class AddSubmittedReviewDecision1795209169819 implements MigrationInterface {
    name = 'AddSubmittedReviewDecision1795209169819'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`content_review_decisions\` CHANGE \`decision\` \`decision\` enum ('SUBMITTED', 'APPROVED', 'CHANGES_REQUESTED') NOT NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`content_review_decisions\` CHANGE \`decision\` \`decision\` enum ('APPROVED', 'CHANGES_REQUESTED') NOT NULL`);
    }

}
