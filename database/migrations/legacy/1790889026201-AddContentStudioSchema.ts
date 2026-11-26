import { MigrationInterface, QueryRunner } from "typeorm";

export class AddContentStudioSchema1790889026201 implements MigrationInterface {
    name = 'AddContentStudioSchema1790889026201'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`content_generation_jobs\` (\`id\` varchar(36) NOT NULL, \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`stage_id\` varchar(36) NOT NULL, \`idempotencyKey\` varchar(191) NOT NULL, \`capability\` enum ('TEXT_STRUCTURED', 'IMAGE_GENERATION') NOT NULL, \`status\` enum ('PENDING', 'RUNNING', 'RETRY_SCHEDULED', 'SUCCEEDED', 'FAILED', 'CANCELLED') NOT NULL DEFAULT 'PENDING', \`normalizedRequest\` json NOT NULL, \`configurationSnapshot\` json NOT NULL, \`attempts\` int UNSIGNED NOT NULL DEFAULT '0', \`availableAt\` datetime NOT NULL, \`workerId\` varchar(100) NULL, \`leaseExpiresAt\` datetime NULL, \`heartbeatAt\` datetime NULL, \`errorCode\` varchar(80) NULL, \`errorMessage\` varchar(500) NULL, \`requestedById\` varchar(36) NOT NULL, UNIQUE INDEX \`IDX_0331a484feee6a1cc527b622db\` (\`idempotencyKey\`), INDEX \`IDX_d586a44c8117c5e92fcdb506c3\` (\`requestedById\`), INDEX \`IDX_362c5034b91694641f68f4af4a\` (\`status\`, \`leaseExpiresAt\`), INDEX \`IDX_1124d72075693ba3ce22c08f81\` (\`status\`, \`availableAt\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`content_versions\` (\`id\` varchar(36) NOT NULL, \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`stage_id\` varchar(36) NOT NULL, \`versionNumber\` int UNSIGNED NOT NULL, \`structuredContent\` json NOT NULL, \`contentChecksum\` char(64) NOT NULL, \`templateVersion\` varchar(64) NOT NULL, \`generationSnapshot\` json NULL, \`createdById\` varchar(36) NOT NULL, INDEX \`IDX_94a7d6b7717b13910216cdc5af\` (\`createdById\`), UNIQUE INDEX \`IDX_15df499b8866291c75f8ff2e26\` (\`stage_id\`, \`versionNumber\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`content_stages\` (\`id\` varchar(36) NOT NULL, \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`track_id\` varchar(36) NOT NULL, \`stageType\` enum ('CANONICAL_BASE', 'LESSON', 'DISCUSSION', 'ACTIVITY', 'VISUAL', 'FACILITATOR_GUIDANCE') NOT NULL, \`position\` smallint UNSIGNED NOT NULL, \`required\` tinyint NOT NULL DEFAULT 1, \`dependencies\` json NOT NULL, \`status\` enum ('NOT_STARTED', 'GENERATING', 'DRAFT', 'PRODUCER_APPROVED', 'IN_REVIEW', 'APPROVED', 'FAILED', 'STALE', 'CHANGES_REQUESTED', 'NOT_REQUIRED') NOT NULL DEFAULT 'NOT_STARTED', \`current_version_id\` varchar(36) NULL, \`lockVersion\` int NOT NULL, INDEX \`IDX_a76bffde5bc3268254a623f4ad\` (\`status\`, \`updatedAt\`), UNIQUE INDEX \`IDX_b12b9628dc981542b241019c7d\` (\`track_id\`, \`stageType\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`content_tracks\` (\`id\` varchar(36) NOT NULL, \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`package_id\` varchar(36) NOT NULL, \`audience\` enum ('BABY', 'CHILD', 'TEEN', 'ADULT') NOT NULL, \`audienceName\` varchar(80) NOT NULL, \`minimumAge\` smallint UNSIGNED NOT NULL, \`maximumAge\` smallint UNSIGNED NULL, UNIQUE INDEX \`IDX_10ed217344d3f3ad96ea966ede\` (\`package_id\`, \`audience\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`content_packages\` (\`id\` varchar(36) NOT NULL, \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`theme\` varchar(180) NOT NULL, \`biblicalReferences\` varchar(500) NOT NULL, \`canonicalObjective\` text NOT NULL, \`canonicalNotes\` text NULL, \`templateCatalogVersion\` varchar(64) NOT NULL, \`status\` enum ('DRAFT', 'IN_PROGRESS', 'PACKAGE_READY', 'IN_REVIEW', 'CHANGES_REQUESTED', 'READY_FOR_PUBLICATION', 'PUBLISHING', 'PUBLISHED', 'ARCHIVED') NOT NULL DEFAULT 'DRAFT', \`createdById\` varchar(36) NOT NULL, \`archivedAt\` datetime NULL, \`lockVersion\` int NOT NULL, INDEX \`IDX_8bbf923efe6aaeca6714bbf0b0\` (\`createdById\`), INDEX \`IDX_bf59366819b5ed723cb977fd8a\` (\`status\`, \`updatedAt\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`content_assets\` (\`id\` varchar(36) NOT NULL, \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`package_id\` varchar(36) NOT NULL, \`stage_id\` varchar(36) NULL, \`version_id\` varchar(36) NULL, \`kind\` enum ('GENERATED_IMAGE', 'UPLOADED_IMAGE', 'PREVIEW_PDF', 'EXPORT_PDF') NOT NULL, \`storageKey\` varchar(500) NOT NULL, \`mediaType\` varchar(120) NOT NULL, \`sizeBytes\` bigint UNSIGNED NOT NULL, \`checksum\` char(64) NOT NULL, UNIQUE INDEX \`IDX_51be70f1edd8c191eb38d8c127\` (\`storageKey\`), INDEX \`IDX_ece9966b8f5e7115dd0bd02d8c\` (\`package_id\`, \`stage_id\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`content_review_comments\` (\`id\` varchar(36) NOT NULL, \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`package_id\` varchar(36) NOT NULL, \`stage_id\` varchar(36) NOT NULL, \`version_id\` varchar(36) NOT NULL, \`blockKey\` varchar(255) NULL, \`message\` text NOT NULL, \`status\` enum ('OPEN', 'RESOLVED') NOT NULL DEFAULT 'OPEN', \`authorId\` varchar(36) NOT NULL, \`resolvedById\` varchar(36) NULL, \`resolvedAt\` datetime NULL, INDEX \`IDX_5b1fffcbc32e76ecab30c2173e\` (\`stage_id\`, \`status\`, \`createdAt\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`content_publications\` (\`id\` varchar(36) NOT NULL, \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`package_id\` varchar(36) NOT NULL, \`idempotencyKey\` varchar(191) NOT NULL, \`targetType\` enum ('PDF_EXPORT') NOT NULL DEFAULT 'PDF_EXPORT', \`status\` enum ('PENDING', 'PUBLISHING', 'PUBLISHED', 'FAILED', 'UNCERTAIN') NOT NULL DEFAULT 'PENDING', \`approvedVersions\` json NOT NULL, \`asset_id\` varchar(36) NULL, \`errorCode\` varchar(80) NULL, \`publishedAt\` datetime NULL, \`requestedById\` varchar(36) NOT NULL, \`lockVersion\` int NOT NULL, UNIQUE INDEX \`IDX_0da90484c869c1e8616b6f5c63\` (\`idempotencyKey\`), INDEX \`IDX_f64d6d6b0db6c223a6dbddef1e\` (\`package_id\`, \`createdAt\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`ALTER TABLE \`content_generation_jobs\` ADD CONSTRAINT \`FK_67e85ad941f4b33a4e120e9f4ab\` FOREIGN KEY (\`stage_id\`) REFERENCES \`content_stages\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`content_versions\` ADD CONSTRAINT \`FK_34b02b5e7be1d5acfa728ab9b5e\` FOREIGN KEY (\`stage_id\`) REFERENCES \`content_stages\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`content_stages\` ADD CONSTRAINT \`FK_4e9e17fc03f4f45f1d366aa2607\` FOREIGN KEY (\`track_id\`) REFERENCES \`content_tracks\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`content_stages\` ADD CONSTRAINT \`FK_b6ace6e5191da8ede50c9a545d9\` FOREIGN KEY (\`current_version_id\`) REFERENCES \`content_versions\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`content_tracks\` ADD CONSTRAINT \`FK_41b4bb7fd46d0d57541408d6db7\` FOREIGN KEY (\`package_id\`) REFERENCES \`content_packages\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`content_assets\` ADD CONSTRAINT \`FK_5980fa1ff2a8da951db1f619f2a\` FOREIGN KEY (\`package_id\`) REFERENCES \`content_packages\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`content_assets\` ADD CONSTRAINT \`FK_3b18a00f02902afc641dc454279\` FOREIGN KEY (\`stage_id\`) REFERENCES \`content_stages\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`content_assets\` ADD CONSTRAINT \`FK_ca6cb71b2dfd852c6af5ad50fa2\` FOREIGN KEY (\`version_id\`) REFERENCES \`content_versions\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`content_review_comments\` ADD CONSTRAINT \`FK_b3294d6eea86acf3d76ae4422d9\` FOREIGN KEY (\`package_id\`) REFERENCES \`content_packages\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`content_review_comments\` ADD CONSTRAINT \`FK_127b7d79e1e8bb1773a0404df97\` FOREIGN KEY (\`stage_id\`) REFERENCES \`content_stages\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`content_review_comments\` ADD CONSTRAINT \`FK_d255528d81b7f7468c1eeceebdb\` FOREIGN KEY (\`version_id\`) REFERENCES \`content_versions\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`content_publications\` ADD CONSTRAINT \`FK_46a15f77a13cc624095a3235d97\` FOREIGN KEY (\`package_id\`) REFERENCES \`content_packages\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`content_publications\` ADD CONSTRAINT \`FK_c18f3f72768ed151ec9a1f316c6\` FOREIGN KEY (\`asset_id\`) REFERENCES \`content_assets\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`content_publications\` DROP FOREIGN KEY \`FK_c18f3f72768ed151ec9a1f316c6\``);
        await queryRunner.query(`ALTER TABLE \`content_publications\` DROP FOREIGN KEY \`FK_46a15f77a13cc624095a3235d97\``);
        await queryRunner.query(`ALTER TABLE \`content_review_comments\` DROP FOREIGN KEY \`FK_d255528d81b7f7468c1eeceebdb\``);
        await queryRunner.query(`ALTER TABLE \`content_review_comments\` DROP FOREIGN KEY \`FK_127b7d79e1e8bb1773a0404df97\``);
        await queryRunner.query(`ALTER TABLE \`content_review_comments\` DROP FOREIGN KEY \`FK_b3294d6eea86acf3d76ae4422d9\``);
        await queryRunner.query(`ALTER TABLE \`content_assets\` DROP FOREIGN KEY \`FK_ca6cb71b2dfd852c6af5ad50fa2\``);
        await queryRunner.query(`ALTER TABLE \`content_assets\` DROP FOREIGN KEY \`FK_3b18a00f02902afc641dc454279\``);
        await queryRunner.query(`ALTER TABLE \`content_assets\` DROP FOREIGN KEY \`FK_5980fa1ff2a8da951db1f619f2a\``);
        await queryRunner.query(`ALTER TABLE \`content_tracks\` DROP FOREIGN KEY \`FK_41b4bb7fd46d0d57541408d6db7\``);
        await queryRunner.query(`ALTER TABLE \`content_stages\` DROP FOREIGN KEY \`FK_b6ace6e5191da8ede50c9a545d9\``);
        await queryRunner.query(`ALTER TABLE \`content_stages\` DROP FOREIGN KEY \`FK_4e9e17fc03f4f45f1d366aa2607\``);
        await queryRunner.query(`ALTER TABLE \`content_versions\` DROP FOREIGN KEY \`FK_34b02b5e7be1d5acfa728ab9b5e\``);
        await queryRunner.query(`ALTER TABLE \`content_generation_jobs\` DROP FOREIGN KEY \`FK_67e85ad941f4b33a4e120e9f4ab\``);
        await queryRunner.query(`DROP INDEX \`IDX_f64d6d6b0db6c223a6dbddef1e\` ON \`content_publications\``);
        await queryRunner.query(`DROP INDEX \`IDX_0da90484c869c1e8616b6f5c63\` ON \`content_publications\``);
        await queryRunner.query(`DROP TABLE \`content_publications\``);
        await queryRunner.query(`DROP INDEX \`IDX_5b1fffcbc32e76ecab30c2173e\` ON \`content_review_comments\``);
        await queryRunner.query(`DROP TABLE \`content_review_comments\``);
        await queryRunner.query(`DROP INDEX \`IDX_ece9966b8f5e7115dd0bd02d8c\` ON \`content_assets\``);
        await queryRunner.query(`DROP INDEX \`IDX_51be70f1edd8c191eb38d8c127\` ON \`content_assets\``);
        await queryRunner.query(`DROP TABLE \`content_assets\``);
        await queryRunner.query(`DROP INDEX \`IDX_bf59366819b5ed723cb977fd8a\` ON \`content_packages\``);
        await queryRunner.query(`DROP INDEX \`IDX_8bbf923efe6aaeca6714bbf0b0\` ON \`content_packages\``);
        await queryRunner.query(`DROP TABLE \`content_packages\``);
        await queryRunner.query(`DROP INDEX \`IDX_10ed217344d3f3ad96ea966ede\` ON \`content_tracks\``);
        await queryRunner.query(`DROP TABLE \`content_tracks\``);
        await queryRunner.query(`DROP INDEX \`IDX_b12b9628dc981542b241019c7d\` ON \`content_stages\``);
        await queryRunner.query(`DROP INDEX \`IDX_a76bffde5bc3268254a623f4ad\` ON \`content_stages\``);
        await queryRunner.query(`DROP TABLE \`content_stages\``);
        await queryRunner.query(`DROP INDEX \`IDX_15df499b8866291c75f8ff2e26\` ON \`content_versions\``);
        await queryRunner.query(`DROP INDEX \`IDX_94a7d6b7717b13910216cdc5af\` ON \`content_versions\``);
        await queryRunner.query(`DROP TABLE \`content_versions\``);
        await queryRunner.query(`DROP INDEX \`IDX_1124d72075693ba3ce22c08f81\` ON \`content_generation_jobs\``);
        await queryRunner.query(`DROP INDEX \`IDX_362c5034b91694641f68f4af4a\` ON \`content_generation_jobs\``);
        await queryRunner.query(`DROP INDEX \`IDX_d586a44c8117c5e92fcdb506c3\` ON \`content_generation_jobs\``);
        await queryRunner.query(`DROP INDEX \`IDX_0331a484feee6a1cc527b622db\` ON \`content_generation_jobs\``);
        await queryRunner.query(`DROP TABLE \`content_generation_jobs\``);
    }

}
