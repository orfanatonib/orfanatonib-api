import { MigrationInterface, QueryRunner } from "typeorm";

export class AddIncrementalPublicationByTrack1795203171389 implements MigrationInterface {
    name = 'AddIncrementalPublicationByTrack1795203171389'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`content_tracks\` ADD \`published_at\` datetime NULL`);
        await queryRunner.query(`ALTER TABLE \`content_tracks\` ADD \`publication_id\` varchar(36) NULL`);
        await queryRunner.query(`ALTER TABLE \`content_publications\` ADD \`audiences\` json NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`content_publications\` DROP COLUMN \`audiences\``);
        await queryRunner.query(`ALTER TABLE \`content_tracks\` DROP COLUMN \`publication_id\``);
        await queryRunner.query(`ALTER TABLE \`content_tracks\` DROP COLUMN \`published_at\``);
    }

}
