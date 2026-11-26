import { MigrationInterface, QueryRunner } from "typeorm";

export class AddInboxNotifications1795441735157 implements MigrationInterface {
    name = 'AddInboxNotifications1795441735157'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`inbox_notifications\` (\`id\` varchar(36) NOT NULL, \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`recipientId\` varchar(36) NOT NULL, \`source\` enum ('ORFANATO_STUDIO', 'CLUBINHO_LESSONS') NOT NULL, \`type\` enum ('PRODUCTION_COMPLETED', 'SUBMITTED_FOR_REVIEW', 'RESUBMITTED_FOR_REVIEW', 'CHANGES_REQUESTED', 'STAGE_APPROVED', 'PUBLISHED', 'GENERATION_COMPLETED', 'GENERATION_FAILED') NOT NULL, \`title\` varchar(160) NOT NULL, \`preview\` varchar(400) NOT NULL, \`targetKind\` enum ('STUDIO_PACKAGE', 'CLUBINHO_LESSON') NOT NULL, \`targetId\` varchar(36) NOT NULL, \`targetAudience\` varchar(20) NULL, \`targetStage\` varchar(40) NULL, \`actorId\` varchar(36) NULL, \`dedupeKey\` varchar(190) NOT NULL, \`readAt\` datetime NULL, INDEX \`IDX_inbox_notification_recipient_read_created\` (\`recipientId\`, \`readAt\`, \`createdAt\`), UNIQUE INDEX \`UQ_inbox_notification_recipient_dedupe\` (\`recipientId\`, \`dedupeKey\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`ALTER TABLE \`inbox_notifications\` ADD CONSTRAINT \`FK_dbc0750825cb4a4b181f5863713\` FOREIGN KEY (\`recipientId\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`inbox_notifications\` DROP FOREIGN KEY \`FK_dbc0750825cb4a4b181f5863713\``);
        await queryRunner.query(`DROP INDEX \`UQ_inbox_notification_recipient_dedupe\` ON \`inbox_notifications\``);
        await queryRunner.query(`DROP INDEX \`IDX_inbox_notification_recipient_read_created\` ON \`inbox_notifications\``);
        await queryRunner.query(`DROP TABLE \`inbox_notifications\``);
    }

}
