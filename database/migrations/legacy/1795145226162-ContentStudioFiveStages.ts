import { MigrationInterface, QueryRunner } from "typeorm";

export class ContentStudioFiveStages1795145226162 implements MigrationInterface {
    name = 'ContentStudioFiveStages1795145226162'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX \`IDX_b12b9628dc981542b241019c7d\` ON \`content_stages\``);
        await queryRunner.query(`ALTER TABLE \`content_stages\` CHANGE \`stageType\` \`stageType\` enum ('LESSON', 'LESSON_VISUALS', 'VERSE_VISUALS', 'VERSE_FIXATION', 'STANDARD_GAME') NOT NULL`);
        await queryRunner.query(`DROP INDEX \`IDX_3a69b51e65e155154531817da8\` ON \`content_prompt_preferences\``);
        await queryRunner.query(`ALTER TABLE \`content_prompt_preferences\` CHANGE \`stage_type\` \`stage_type\` enum ('LESSON', 'LESSON_VISUALS', 'VERSE_VISUALS', 'VERSE_FIXATION', 'STANDARD_GAME') NOT NULL`);
        await queryRunner.query(`CREATE UNIQUE INDEX \`IDX_b12b9628dc981542b241019c7d\` ON \`content_stages\` (\`track_id\`, \`stageType\`)`);
        await queryRunner.query(`CREATE UNIQUE INDEX \`IDX_3a69b51e65e155154531817da8\` ON \`content_prompt_preferences\` (\`user_id\`, \`audience\`, \`stage_type\`)`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX \`IDX_3a69b51e65e155154531817da8\` ON \`content_prompt_preferences\``);
        await queryRunner.query(`DROP INDEX \`IDX_b12b9628dc981542b241019c7d\` ON \`content_stages\``);
        await queryRunner.query(`ALTER TABLE \`content_prompt_preferences\` CHANGE \`stage_type\` \`stage_type\` enum ('CANONICAL_BASE', 'LESSON', 'DISCUSSION', 'ACTIVITY', 'VISUAL', 'FACILITATOR_GUIDANCE') NOT NULL`);
        await queryRunner.query(`CREATE UNIQUE INDEX \`IDX_3a69b51e65e155154531817da8\` ON \`content_prompt_preferences\` (\`user_id\`, \`audience\`, \`stage_type\`)`);
        await queryRunner.query(`ALTER TABLE \`content_stages\` CHANGE \`stageType\` \`stageType\` enum ('CANONICAL_BASE', 'LESSON', 'DISCUSSION', 'ACTIVITY', 'VISUAL', 'FACILITATOR_GUIDANCE') NOT NULL`);
        await queryRunner.query(`CREATE UNIQUE INDEX \`IDX_b12b9628dc981542b241019c7d\` ON \`content_stages\` (\`track_id\`, \`stageType\`)`);
    }

}
