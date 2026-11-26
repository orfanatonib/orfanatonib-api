import { MigrationInterface, QueryRunner } from "typeorm";

export class AddContentStageTrackIndex1795145196673 implements MigrationInterface {
    name = 'AddContentStageTrackIndex1795145196673'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE INDEX \`IDX_4e9e17fc03f4f45f1d366aa260\` ON \`content_stages\` (\`track_id\`)`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX \`IDX_4e9e17fc03f4f45f1d366aa260\` ON \`content_stages\``);
    }

}
