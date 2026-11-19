import { MigrationInterface, QueryRunner } from "typeorm";

export class AddContentPromptPreferences1795112241714 implements MigrationInterface {
    name = 'AddContentPromptPreferences1795112241714'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`content_prompt_preferences\` (\`id\` varchar(36) NOT NULL, \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`user_id\` varchar(36) NOT NULL, \`audience\` enum ('BABY', 'CHILD', 'TEEN', 'ADULT') NOT NULL, \`stage_type\` enum ('CANONICAL_BASE', 'LESSON', 'DISCUSSION', 'ACTIVITY', 'VISUAL', 'FACILITATOR_GUIDANCE') NOT NULL, \`custom_prompt\` text NULL, \`lock_version\` int UNSIGNED NOT NULL DEFAULT '1', UNIQUE INDEX \`IDX_3a69b51e65e155154531817da8\` (\`user_id\`, \`audience\`, \`stage_type\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX \`IDX_3a69b51e65e155154531817da8\` ON \`content_prompt_preferences\``);
        await queryRunner.query(`DROP TABLE \`content_prompt_preferences\``);
    }

}
