import { MigrationInterface, QueryRunner } from "typeorm";

export class InitialSchemaBaseline1790874963807 implements MigrationInterface {
    name = 'InitialSchemaBaseline1790874963807'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE \`addresses\` (
                \`id\` varchar(36) NOT NULL,
                \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
                \`street\` varchar(255) NULL,
                \`number\` varchar(255) NULL,
                \`district\` varchar(255) NULL,
                \`city\` varchar(255) NOT NULL,
                \`state\` varchar(255) NOT NULL,
                \`postalCode\` varchar(255) NULL,
                \`complement\` varchar(255) NULL,
                PRIMARY KEY (\`id\`)
            ) ENGINE = InnoDB
        `);
        await queryRunner.query(`
            CREATE TABLE \`member_profiles\` (
                \`id\` varchar(36) NOT NULL,
                \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
                \`active\` tinyint NOT NULL DEFAULT 1,
                \`team_id\` varchar(36) NULL,
                \`user_id\` varchar(36) NOT NULL,
                UNIQUE INDEX \`UQ_member_profile_user\` (\`user_id\`),
                UNIQUE INDEX \`REL_71f045ea73b7e7e39e6b6508db\` (\`user_id\`),
                PRIMARY KEY (\`id\`)
            ) ENGINE = InnoDB
        `);
        await queryRunner.query(`
            CREATE TABLE \`users\` (
                \`id\` varchar(36) NOT NULL,
                \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
                \`email\` varchar(255) NOT NULL,
                \`password\` varchar(255) NOT NULL,
                \`phone\` varchar(255) NOT NULL,
                \`name\` varchar(255) NOT NULL,
                \`active\` tinyint NOT NULL DEFAULT 0,
                \`completed\` tinyint NOT NULL DEFAULT 0,
                \`commonUser\` tinyint NOT NULL DEFAULT 1,
                \`role\` enum ('admin', 'member', 'leader') NOT NULL DEFAULT 'member',
                \`refreshToken\` text NULL,
                \`emailVerifiedAt\` datetime NULL,
                UNIQUE INDEX \`IDX_97672ac88f789774dd47f7c8be\` (\`email\`),
                PRIMARY KEY (\`id\`)
            ) ENGINE = InnoDB
        `);
        await queryRunner.query(`
            CREATE TABLE \`leader_profiles\` (
                \`id\` varchar(36) NOT NULL,
                \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
                \`active\` tinyint NOT NULL DEFAULT 1,
                \`user_id\` varchar(36) NOT NULL,
                UNIQUE INDEX \`UQ_leader_profile_user\` (\`user_id\`),
                UNIQUE INDEX \`REL_9d87629e7fe332a5177a79f6c3\` (\`user_id\`),
                PRIMARY KEY (\`id\`)
            ) ENGINE = InnoDB
        `);
        await queryRunner.query(`
            CREATE TABLE \`teams\` (
                \`id\` varchar(36) NOT NULL,
                \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
                \`numberTeam\` int NOT NULL,
                \`description\` text NULL,
                \`shelter_id\` varchar(36) NOT NULL,
                PRIMARY KEY (\`id\`)
            ) ENGINE = InnoDB
        `);
        await queryRunner.query(`
            CREATE TABLE \`routes\` (
                \`id\` varchar(36) NOT NULL,
                \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
                \`title\` varchar(255) NOT NULL,
                \`subtitle\` text NOT NULL,
                \`public\` tinyint NOT NULL DEFAULT 1,
                \`current\` tinyint NOT NULL DEFAULT 0,
                \`image\` varchar(255) NULL,
                \`idToFetch\` varchar(255) NOT NULL,
                \`path\` varchar(255) NOT NULL,
                \`entityType\` varchar(100) NOT NULL,
                \`description\` text NOT NULL,
                \`entityId\` varchar(255) NOT NULL,
                \`type\` enum ('page', 'doc', 'image', 'other') NOT NULL,
                UNIQUE INDEX \`IDX_6991954a7bed07733ce954bb89\` (\`path\`),
                PRIMARY KEY (\`id\`)
            ) ENGINE = InnoDB
        `);
        await queryRunner.query(`
            CREATE TABLE \`shelters\` (
                \`id\` varchar(36) NOT NULL,
                \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
                \`name\` varchar(255) NOT NULL,
                \`description\` text NULL,
                \`teamsQuantity\` int NULL,
                \`address_id\` varchar(36) NULL,
                \`routeId\` varchar(36) NULL,
                UNIQUE INDEX \`REL_23aee355a2aad14acf0f2822f4\` (\`address_id\`),
                UNIQUE INDEX \`REL_379bc21f2e9f465794ef4c24a1\` (\`routeId\`),
                PRIMARY KEY (\`id\`)
            ) ENGINE = InnoDB
        `);
        await queryRunner.query(`
            CREATE TABLE \`pagelas\` (
                \`id\` varchar(36) NOT NULL,
                \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
                \`visit\` int UNSIGNED NOT NULL,
                \`year\` smallint UNSIGNED NOT NULL,
                \`referenceDate\` date NOT NULL,
                \`present\` tinyint NOT NULL DEFAULT 0,
                \`notes\` varchar(500) NULL,
                \`sheltered_id\` varchar(36) NOT NULL,
                \`member_profile_id\` varchar(36) NOT NULL,
                UNIQUE INDEX \`UQ_pagela_sheltered_year_visit\` (\`sheltered_id\`, \`year\`, \`visit\`),
                PRIMARY KEY (\`id\`)
            ) ENGINE = InnoDB
        `);
        await queryRunner.query(`
            CREATE TABLE \`sheltered\` (
                \`id\` varchar(36) NOT NULL,
                \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
                \`name\` varchar(255) NOT NULL,
                \`guardianName\` varchar(255) NULL,
                \`gender\` char(1) NOT NULL,
                \`guardianPhone\` varchar(32) NULL,
                \`birthDate\` date NULL,
                \`joinedAt\` date NULL,
                \`active\` tinyint NOT NULL DEFAULT 1,
                \`shelter_id\` varchar(36) NULL,
                \`address_id\` varchar(36) NULL,
                UNIQUE INDEX \`REL_20a8559e0ff43ab951b0f51584\` (\`address_id\`),
                PRIMARY KEY (\`id\`)
            ) ENGINE = InnoDB
        `);
        await queryRunner.query(`
            CREATE TABLE \`accepted_christs\` (
                \`id\` varchar(36) NOT NULL,
                \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
                \`decision\` enum ('ACCEPTED', 'RECONCILED') NULL,
                \`sheltered_id\` varchar(36) NULL,
                \`notes\` varchar(500) NULL,
                PRIMARY KEY (\`id\`)
            ) ENGINE = InnoDB
        `);
        await queryRunner.query(`
            CREATE TABLE \`atendentes\` (
                \`id\` varchar(36) NOT NULL,
                \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
                \`name\` varchar(255) NULL,
                \`attendableType\` enum ('integration', 'user') NULL,
                \`attendableId\` varchar(36) NULL,
                PRIMARY KEY (\`id\`)
            ) ENGINE = InnoDB
        `);
        await queryRunner.query(`
            CREATE TABLE \`events\` (
                \`id\` varchar(36) NOT NULL,
                \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
                \`title\` varchar(255) NOT NULL,
                \`description\` varchar(255) NULL,
                \`date\` varchar(255) NOT NULL,
                \`location\` varchar(255) NULL,
                \`audience\` enum ('all', 'members', 'leaders') NOT NULL DEFAULT 'all',
                \`eventType\` enum ('visit', 'meeting', 'custom') NULL DEFAULT 'custom',
                \`shelter_schedule_id\` varchar(36) NULL,
                PRIMARY KEY (\`id\`)
            ) ENGINE = InnoDB
        `);
        await queryRunner.query(`
            CREATE TABLE \`shelter_schedules\` (
                \`id\` varchar(36) NOT NULL,
                \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
                \`visitNumber\` int NOT NULL,
                \`visitDate\` varchar(255) NULL,
                \`meetingDate\` varchar(255) NULL,
                \`lessonContent\` text NOT NULL,
                \`observation\` text NULL,
                \`meetingRoom\` varchar(255) NULL,
                \`team_id\` varchar(36) NULL,
                PRIMARY KEY (\`id\`)
            ) ENGINE = InnoDB
        `);
        await queryRunner.query(`
            CREATE TABLE \`attendance_records\` (
                \`id\` varchar(36) NOT NULL,
                \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
                \`category\` enum ('visit', 'meeting') NOT NULL DEFAULT 'visit',
                \`type\` enum ('present', 'absent') NOT NULL,
                \`comment\` text NULL,
                \`member_id\` varchar(36) NULL,
                \`shelter_schedule_id\` varchar(36) NULL,
                PRIMARY KEY (\`id\`)
            ) ENGINE = InnoDB
        `);
        await queryRunner.query(`
            CREATE TABLE \`comments\` (
                \`id\` varchar(36) NOT NULL,
                \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
                \`name\` varchar(100) NOT NULL,
                \`comment\` text NOT NULL,
                \`shelter\` varchar(100) NOT NULL,
                \`neighborhood\` varchar(100) NOT NULL,
                \`published\` tinyint NOT NULL DEFAULT 0,
                PRIMARY KEY (\`id\`)
            ) ENGINE = InnoDB
        `);
        await queryRunner.query(`
            CREATE TABLE \`contacts\` (
                \`id\` varchar(36) NOT NULL,
                \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
                \`name\` varchar(255) NOT NULL,
                \`email\` varchar(255) NOT NULL,
                \`phone\` varchar(255) NOT NULL,
                \`message\` text NOT NULL,
                \`read\` tinyint NOT NULL DEFAULT 0,
                PRIMARY KEY (\`id\`)
            ) ENGINE = InnoDB
        `);
        await queryRunner.query(`
            CREATE TABLE \`meditations\` (
                \`id\` varchar(36) NOT NULL,
                \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
                \`topic\` varchar(255) NOT NULL,
                \`startDate\` date NOT NULL,
                \`endDate\` date NOT NULL,
                PRIMARY KEY (\`id\`)
            ) ENGINE = InnoDB
        `);
        await queryRunner.query(`
            CREATE TABLE \`meditation_days\` (
                \`id\` varchar(36) NOT NULL,
                \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
                \`day\` enum (
                    'Monday',
                    'Tuesday',
                    'Wednesday',
                    'Thursday',
                    'Friday'
                ) NOT NULL,
                \`verse\` text NOT NULL,
                \`topic\` varchar(255) NOT NULL,
                \`meditationId\` varchar(36) NULL,
                PRIMARY KEY (\`id\`)
            ) ENGINE = InnoDB
        `);
        await queryRunner.query(`
            CREATE TABLE \`documents\` (
                \`id\` varchar(36) NOT NULL,
                \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
                \`name\` varchar(255) NOT NULL,
                \`description\` text NULL,
                \`routeId\` varchar(36) NULL,
                UNIQUE INDEX \`REL_15ac883805e4c80918f4a26d9d\` (\`routeId\`),
                PRIMARY KEY (\`id\`)
            ) ENGINE = InnoDB
        `);
        await queryRunner.query(`
            CREATE TABLE \`email_outbox\` (
                \`id\` varchar(36) NOT NULL,
                \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
                \`templateKey\` varchar(64) NOT NULL,
                \`recipient\` varchar(320) NOT NULL,
                \`subject\` varchar(255) NOT NULL,
                \`html\` mediumtext NOT NULL,
                \`text\` text NOT NULL,
                \`status\` enum ('pending', 'sent', 'failed', 'skipped') NOT NULL DEFAULT 'pending',
                \`attempts\` int NOT NULL DEFAULT '0',
                \`scheduledFor\` datetime NOT NULL,
                \`sentAt\` datetime NULL,
                \`lastError\` text NULL,
                \`dedupeKey\` varchar(191) NULL,
                UNIQUE INDEX \`IDX_7df3c823b1c1b78e23ed1c6636\` (\`dedupeKey\`),
                INDEX \`IDX_ce187f180f5a0c1f9cf7acb991\` (\`status\`, \`scheduledFor\`),
                PRIMARY KEY (\`id\`)
            ) ENGINE = InnoDB
        `);
        await queryRunner.query(`
            CREATE TABLE \`email_verification_tokens\` (
                \`id\` varchar(36) NOT NULL,
                \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
                \`token\` varchar(128) NOT NULL,
                \`expiresAt\` datetime NOT NULL,
                \`usedAt\` datetime NULL,
                \`userId\` varchar(36) NOT NULL,
                UNIQUE INDEX \`IDX_3d1613f95c6a564a3b588d161a\` (\`token\`),
                INDEX \`IDX_10f285d038feb767bf7c2da14b\` (\`userId\`),
                PRIMARY KEY (\`id\`)
            ) ENGINE = InnoDB
        `);
        await queryRunner.query(`
            CREATE TABLE \`feature_flags\` (
                \`id\` varchar(36) NOT NULL,
                \`key\` varchar(255) NOT NULL,
                \`name\` varchar(255) NOT NULL,
                \`description\` text NULL,
                \`enabled\` tinyint NOT NULL DEFAULT 0,
                \`environment\` varchar(50) NULL,
                \`metadata\` json NULL,
                \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
                UNIQUE INDEX \`IDX_36d0344370584b4d6a953c53a6\` (\`key\`),
                PRIMARY KEY (\`id\`)
            ) ENGINE = InnoDB
        `);
        await queryRunner.query(`
            CREATE TABLE \`ideas_sections\` (
                \`id\` varchar(36) NOT NULL,
                \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
                \`title\` varchar(255) NOT NULL,
                \`description\` text NOT NULL,
                \`public\` tinyint NOT NULL DEFAULT 0,
                \`pageId\` varchar(36) NULL,
                \`user_id\` varchar(36) NULL,
                PRIMARY KEY (\`id\`)
            ) ENGINE = InnoDB
        `);
        await queryRunner.query(`
            CREATE TABLE \`ideas_pages\` (
                \`id\` varchar(36) NOT NULL,
                \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
                \`title\` varchar(255) NOT NULL,
                \`subtitle\` varchar(255) NOT NULL DEFAULT '',
                \`description\` text NOT NULL,
                \`public\` tinyint NOT NULL DEFAULT 0,
                \`routeId\` varchar(36) NULL,
                UNIQUE INDEX \`REL_e93c29cf0e680a8e23e3c9d295\` (\`routeId\`),
                PRIMARY KEY (\`id\`)
            ) ENGINE = InnoDB
        `);
        await queryRunner.query(`
            CREATE TABLE \`image_sections\` (
                \`id\` varchar(36) NOT NULL,
                \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
                \`caption\` varchar(255) NOT NULL,
                \`description\` text NOT NULL,
                \`public\` tinyint NOT NULL DEFAULT 1,
                \`pageId\` varchar(36) NULL,
                PRIMARY KEY (\`id\`)
            ) ENGINE = InnoDB
        `);
        await queryRunner.query(`
            CREATE TABLE \`image_pages\` (
                \`id\` varchar(36) NOT NULL,
                \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
                \`name\` varchar(255) NOT NULL,
                \`public\` tinyint NOT NULL,
                \`description\` text NOT NULL,
                \`routeId\` varchar(36) NULL,
                UNIQUE INDEX \`REL_731a6abb597e960c82a19302f3\` (\`routeId\`),
                PRIMARY KEY (\`id\`)
            ) ENGINE = InnoDB
        `);
        await queryRunner.query(`
            CREATE TABLE \`informatives\` (
                \`id\` varchar(36) NOT NULL,
                \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
                \`title\` varchar(255) NOT NULL,
                \`description\` text NOT NULL,
                \`public\` tinyint NOT NULL DEFAULT 1,
                \`routeId\` varchar(36) NULL,
                UNIQUE INDEX \`REL_53aaf0a1d918030b728e40e02b\` (\`routeId\`),
                PRIMARY KEY (\`id\`)
            ) ENGINE = InnoDB
        `);
        await queryRunner.query(`
            CREATE TABLE \`integrations\` (
                \`id\` varchar(36) NOT NULL,
                \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
                \`name\` varchar(255) NULL,
                \`phone\` varchar(255) NULL,
                \`gaLeader\` varchar(255) NULL,
                \`baptized\` tinyint NULL,
                \`churchYears\` int NULL,
                \`previousMinistry\` varchar(255) NULL,
                \`integrationYear\` int NULL,
                PRIMARY KEY (\`id\`)
            ) ENGINE = InnoDB
        `);
        await queryRunner.query(`
            CREATE TABLE \`media_items\` (
                \`id\` varchar(36) NOT NULL,
                \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
                \`title\` varchar(255) NOT NULL,
                \`description\` text NOT NULL,
                \`mediaType\` enum ('video', 'document', 'image', 'audio') NOT NULL,
                \`uploadType\` enum ('link', 'upload') NOT NULL,
                \`platformType\` enum (
                    'youtube',
                    'googledrive',
                    'onedrive',
                    'dropbox',
                    'ANY'
                ) NULL,
                \`url\` varchar(255) NOT NULL,
                \`isLocalFile\` tinyint NOT NULL DEFAULT 0,
                \`originalName\` varchar(255) NULL,
                \`size\` int NULL,
                \`targetId\` varchar(255) NOT NULL,
                \`targetType\` varchar(255) NOT NULL,
                PRIMARY KEY (\`id\`)
            ) ENGINE = InnoDB
        `);
        await queryRunner.query(`
            CREATE TABLE \`password_reset_tokens\` (
                \`id\` varchar(36) NOT NULL,
                \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
                \`token\` varchar(255) NOT NULL,
                \`expiresAt\` datetime NOT NULL,
                \`userId\` varchar(255) NOT NULL,
                PRIMARY KEY (\`id\`)
            ) ENGINE = InnoDB
        `);
        await queryRunner.query(`
            CREATE TABLE \`personal_data\` (
                \`id\` varchar(36) NOT NULL,
                \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
                \`birthDate\` date NULL,
                \`gender\` varchar(255) NULL,
                \`gaLeaderName\` varchar(255) NULL,
                \`gaLeaderContact\` varchar(255) NULL,
                \`userId\` varchar(255) NOT NULL,
                UNIQUE INDEX \`REL_f9806706370e043fd63608ef9d\` (\`userId\`),
                PRIMARY KEY (\`id\`)
            ) ENGINE = InnoDB
        `);
        await queryRunner.query(`
            CREATE TABLE \`site_feedbacks\` (
                \`id\` varchar(36) NOT NULL,
                \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
                \`name\` varchar(100) NOT NULL,
                \`email\` text NULL,
                \`rating\` int NOT NULL,
                \`comment\` text NOT NULL,
                \`category\` enum (
                    'content',
                    'appearance',
                    'usability',
                    'broken_feature',
                    'missing_feature',
                    'performance',
                    'mobile_experience',
                    'suggestion',
                    'complaint',
                    'other'
                ) NOT NULL,
                \`read\` tinyint NOT NULL DEFAULT 0,
                PRIMARY KEY (\`id\`)
            ) ENGINE = InnoDB
        `);
        await queryRunner.query(`
            CREATE TABLE \`user_preferences\` (
                \`id\` varchar(36) NOT NULL,
                \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
                \`loveLanguages\` varchar(255) NULL,
                \`temperaments\` varchar(255) NULL,
                \`favoriteColor\` varchar(255) NULL,
                \`favoriteFood\` varchar(255) NULL,
                \`favoriteMusic\` varchar(255) NULL,
                \`whatMakesYouSmile\` text NULL,
                \`skillsAndTalents\` text NULL,
                \`userId\` varchar(255) NOT NULL,
                UNIQUE INDEX \`REL_b6202d1cacc63a0b9c8dac2abd\` (\`userId\`),
                PRIMARY KEY (\`id\`)
            ) ENGINE = InnoDB
        `);
        await queryRunner.query(`
            CREATE TABLE \`videos_pages\` (
                \`id\` varchar(36) NOT NULL,
                \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
                \`name\` varchar(255) NOT NULL,
                \`public\` tinyint NOT NULL,
                \`description\` text NOT NULL,
                \`routeId\` varchar(36) NULL,
                UNIQUE INDEX \`REL_96d989f11cea25c620480f1a81\` (\`routeId\`),
                PRIMARY KEY (\`id\`)
            ) ENGINE = InnoDB
        `);
        await queryRunner.query(`
            CREATE TABLE \`visit_material_pages\` (
                \`id\` varchar(36) NOT NULL,
                \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
                \`title\` varchar(255) NOT NULL,
                \`subtitle\` text NOT NULL,
                \`testament\` enum ('OLD_TESTAMENT', 'NEW_TESTAMENT') NOT NULL DEFAULT 'OLD_TESTAMENT',
                \`currentWeek\` tinyint NOT NULL DEFAULT 0,
                \`description\` text NOT NULL,
                \`routeId\` varchar(36) NULL,
                UNIQUE INDEX \`REL_cc51378a6c1b00955bdd190ed7\` (\`routeId\`),
                PRIMARY KEY (\`id\`)
            ) ENGINE = InnoDB
        `);
        await queryRunner.query(`
            CREATE TABLE \`visit_reports\` (
                \`id\` varchar(36) NOT NULL,
                \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
                \`teamMembersPresent\` int NOT NULL DEFAULT '0',
                \`shelteredHeardMessage\` int NOT NULL DEFAULT '0',
                \`caretakersHeardMessage\` int NOT NULL DEFAULT '0',
                \`shelteredDecisions\` int NOT NULL DEFAULT '0',
                \`caretakersDecisions\` int NOT NULL DEFAULT '0',
                \`observation\` longtext NULL,
                \`schedule_id\` varchar(36) NULL,
                UNIQUE INDEX \`UQ_visit_report_schedule\` (\`schedule_id\`),
                PRIMARY KEY (\`id\`)
            ) ENGINE = InnoDB
        `);
        await queryRunner.query(`
            CREATE TABLE \`leader_teams\` (
                \`leader_id\` varchar(36) NOT NULL,
                \`team_id\` varchar(36) NOT NULL,
                INDEX \`IDX_a3381fc9f0d34204f023cef598\` (\`leader_id\`),
                INDEX \`IDX_02b5e590f07c914af3f08e38ce\` (\`team_id\`),
                PRIMARY KEY (\`leader_id\`, \`team_id\`)
            ) ENGINE = InnoDB
        `);
        await queryRunner.query(`
            ALTER TABLE \`member_profiles\`
            ADD CONSTRAINT \`FK_1533e17073707a6aaa401ef32e8\` FOREIGN KEY (\`team_id\`) REFERENCES \`teams\`(\`id\`) ON DELETE
            SET NULL ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE \`member_profiles\`
            ADD CONSTRAINT \`FK_71f045ea73b7e7e39e6b6508db3\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE \`leader_profiles\`
            ADD CONSTRAINT \`FK_9d87629e7fe332a5177a79f6c31\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE \`teams\`
            ADD CONSTRAINT \`FK_557f2628febfe2a8c792b95b0e0\` FOREIGN KEY (\`shelter_id\`) REFERENCES \`shelters\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE \`shelters\`
            ADD CONSTRAINT \`FK_23aee355a2aad14acf0f2822f42\` FOREIGN KEY (\`address_id\`) REFERENCES \`addresses\`(\`id\`) ON DELETE RESTRICT ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE \`shelters\`
            ADD CONSTRAINT \`FK_379bc21f2e9f465794ef4c24a13\` FOREIGN KEY (\`routeId\`) REFERENCES \`routes\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE \`pagelas\`
            ADD CONSTRAINT \`FK_24ec828bcae14e9e502fb480bc7\` FOREIGN KEY (\`sheltered_id\`) REFERENCES \`sheltered\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE \`pagelas\`
            ADD CONSTRAINT \`FK_4418f01336fdba8a177551a5487\` FOREIGN KEY (\`member_profile_id\`) REFERENCES \`member_profiles\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE \`sheltered\`
            ADD CONSTRAINT \`FK_c2e7c1a7324059d86e5973b75d9\` FOREIGN KEY (\`shelter_id\`) REFERENCES \`shelters\`(\`id\`) ON DELETE
            SET NULL ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE \`sheltered\`
            ADD CONSTRAINT \`FK_20a8559e0ff43ab951b0f515845\` FOREIGN KEY (\`address_id\`) REFERENCES \`addresses\`(\`id\`) ON DELETE
            SET NULL ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE \`accepted_christs\`
            ADD CONSTRAINT \`FK_20f5bd4b05823c273ca65e2d315\` FOREIGN KEY (\`sheltered_id\`) REFERENCES \`sheltered\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE \`events\`
            ADD CONSTRAINT \`FK_25b9cb8487420d54ccd82a659a2\` FOREIGN KEY (\`shelter_schedule_id\`) REFERENCES \`shelter_schedules\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE \`shelter_schedules\`
            ADD CONSTRAINT \`FK_c6f455806f77c33d8469429a1c0\` FOREIGN KEY (\`team_id\`) REFERENCES \`teams\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE \`attendance_records\`
            ADD CONSTRAINT \`FK_a92098a9fb42aa2d418c2f44097\` FOREIGN KEY (\`member_id\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE \`attendance_records\`
            ADD CONSTRAINT \`FK_f925e701dcd38e02d3ee1f12803\` FOREIGN KEY (\`shelter_schedule_id\`) REFERENCES \`shelter_schedules\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE \`meditation_days\`
            ADD CONSTRAINT \`FK_314365a536c9cca2c9bfe4564f0\` FOREIGN KEY (\`meditationId\`) REFERENCES \`meditations\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE \`documents\`
            ADD CONSTRAINT \`FK_15ac883805e4c80918f4a26d9d6\` FOREIGN KEY (\`routeId\`) REFERENCES \`routes\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE \`email_verification_tokens\`
            ADD CONSTRAINT \`FK_10f285d038feb767bf7c2da14b3\` FOREIGN KEY (\`userId\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE \`ideas_sections\`
            ADD CONSTRAINT \`FK_2f8ce1679c3608200b1ebf137d4\` FOREIGN KEY (\`pageId\`) REFERENCES \`ideas_pages\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE \`ideas_sections\`
            ADD CONSTRAINT \`FK_3b5788c85a952ac47556897345b\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE
            SET NULL ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE \`ideas_pages\`
            ADD CONSTRAINT \`FK_e93c29cf0e680a8e23e3c9d295f\` FOREIGN KEY (\`routeId\`) REFERENCES \`routes\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE \`image_sections\`
            ADD CONSTRAINT \`FK_92d680562cae1d253963f4c3170\` FOREIGN KEY (\`pageId\`) REFERENCES \`image_pages\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE \`image_pages\`
            ADD CONSTRAINT \`FK_731a6abb597e960c82a19302f3b\` FOREIGN KEY (\`routeId\`) REFERENCES \`routes\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE \`informatives\`
            ADD CONSTRAINT \`FK_53aaf0a1d918030b728e40e02b3\` FOREIGN KEY (\`routeId\`) REFERENCES \`routes\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE \`password_reset_tokens\`
            ADD CONSTRAINT \`FK_d6a19d4b4f6c62dcd29daa497e2\` FOREIGN KEY (\`userId\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE \`personal_data\`
            ADD CONSTRAINT \`FK_f9806706370e043fd63608ef9da\` FOREIGN KEY (\`userId\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE \`user_preferences\`
            ADD CONSTRAINT \`FK_b6202d1cacc63a0b9c8dac2abd4\` FOREIGN KEY (\`userId\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE \`videos_pages\`
            ADD CONSTRAINT \`FK_96d989f11cea25c620480f1a81f\` FOREIGN KEY (\`routeId\`) REFERENCES \`routes\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE \`visit_material_pages\`
            ADD CONSTRAINT \`FK_cc51378a6c1b00955bdd190ed76\` FOREIGN KEY (\`routeId\`) REFERENCES \`routes\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE \`visit_reports\`
            ADD CONSTRAINT \`FK_767feac8a3f9c8a7a191e27420f\` FOREIGN KEY (\`schedule_id\`) REFERENCES \`shelter_schedules\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE \`leader_teams\`
            ADD CONSTRAINT \`FK_a3381fc9f0d34204f023cef598a\` FOREIGN KEY (\`leader_id\`) REFERENCES \`leader_profiles\`(\`id\`) ON DELETE CASCADE ON UPDATE CASCADE
        `);
        await queryRunner.query(`
            ALTER TABLE \`leader_teams\`
            ADD CONSTRAINT \`FK_02b5e590f07c914af3f08e38ce9\` FOREIGN KEY (\`team_id\`) REFERENCES \`teams\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE \`leader_teams\` DROP FOREIGN KEY \`FK_02b5e590f07c914af3f08e38ce9\`
        `);
        await queryRunner.query(`
            ALTER TABLE \`leader_teams\` DROP FOREIGN KEY \`FK_a3381fc9f0d34204f023cef598a\`
        `);
        await queryRunner.query(`
            ALTER TABLE \`visit_reports\` DROP FOREIGN KEY \`FK_767feac8a3f9c8a7a191e27420f\`
        `);
        await queryRunner.query(`
            ALTER TABLE \`visit_material_pages\` DROP FOREIGN KEY \`FK_cc51378a6c1b00955bdd190ed76\`
        `);
        await queryRunner.query(`
            ALTER TABLE \`videos_pages\` DROP FOREIGN KEY \`FK_96d989f11cea25c620480f1a81f\`
        `);
        await queryRunner.query(`
            ALTER TABLE \`user_preferences\` DROP FOREIGN KEY \`FK_b6202d1cacc63a0b9c8dac2abd4\`
        `);
        await queryRunner.query(`
            ALTER TABLE \`personal_data\` DROP FOREIGN KEY \`FK_f9806706370e043fd63608ef9da\`
        `);
        await queryRunner.query(`
            ALTER TABLE \`password_reset_tokens\` DROP FOREIGN KEY \`FK_d6a19d4b4f6c62dcd29daa497e2\`
        `);
        await queryRunner.query(`
            ALTER TABLE \`informatives\` DROP FOREIGN KEY \`FK_53aaf0a1d918030b728e40e02b3\`
        `);
        await queryRunner.query(`
            ALTER TABLE \`image_pages\` DROP FOREIGN KEY \`FK_731a6abb597e960c82a19302f3b\`
        `);
        await queryRunner.query(`
            ALTER TABLE \`image_sections\` DROP FOREIGN KEY \`FK_92d680562cae1d253963f4c3170\`
        `);
        await queryRunner.query(`
            ALTER TABLE \`ideas_pages\` DROP FOREIGN KEY \`FK_e93c29cf0e680a8e23e3c9d295f\`
        `);
        await queryRunner.query(`
            ALTER TABLE \`ideas_sections\` DROP FOREIGN KEY \`FK_3b5788c85a952ac47556897345b\`
        `);
        await queryRunner.query(`
            ALTER TABLE \`ideas_sections\` DROP FOREIGN KEY \`FK_2f8ce1679c3608200b1ebf137d4\`
        `);
        await queryRunner.query(`
            ALTER TABLE \`email_verification_tokens\` DROP FOREIGN KEY \`FK_10f285d038feb767bf7c2da14b3\`
        `);
        await queryRunner.query(`
            ALTER TABLE \`documents\` DROP FOREIGN KEY \`FK_15ac883805e4c80918f4a26d9d6\`
        `);
        await queryRunner.query(`
            ALTER TABLE \`meditation_days\` DROP FOREIGN KEY \`FK_314365a536c9cca2c9bfe4564f0\`
        `);
        await queryRunner.query(`
            ALTER TABLE \`attendance_records\` DROP FOREIGN KEY \`FK_f925e701dcd38e02d3ee1f12803\`
        `);
        await queryRunner.query(`
            ALTER TABLE \`attendance_records\` DROP FOREIGN KEY \`FK_a92098a9fb42aa2d418c2f44097\`
        `);
        await queryRunner.query(`
            ALTER TABLE \`shelter_schedules\` DROP FOREIGN KEY \`FK_c6f455806f77c33d8469429a1c0\`
        `);
        await queryRunner.query(`
            ALTER TABLE \`events\` DROP FOREIGN KEY \`FK_25b9cb8487420d54ccd82a659a2\`
        `);
        await queryRunner.query(`
            ALTER TABLE \`accepted_christs\` DROP FOREIGN KEY \`FK_20f5bd4b05823c273ca65e2d315\`
        `);
        await queryRunner.query(`
            ALTER TABLE \`sheltered\` DROP FOREIGN KEY \`FK_20a8559e0ff43ab951b0f515845\`
        `);
        await queryRunner.query(`
            ALTER TABLE \`sheltered\` DROP FOREIGN KEY \`FK_c2e7c1a7324059d86e5973b75d9\`
        `);
        await queryRunner.query(`
            ALTER TABLE \`pagelas\` DROP FOREIGN KEY \`FK_4418f01336fdba8a177551a5487\`
        `);
        await queryRunner.query(`
            ALTER TABLE \`pagelas\` DROP FOREIGN KEY \`FK_24ec828bcae14e9e502fb480bc7\`
        `);
        await queryRunner.query(`
            ALTER TABLE \`shelters\` DROP FOREIGN KEY \`FK_379bc21f2e9f465794ef4c24a13\`
        `);
        await queryRunner.query(`
            ALTER TABLE \`shelters\` DROP FOREIGN KEY \`FK_23aee355a2aad14acf0f2822f42\`
        `);
        await queryRunner.query(`
            ALTER TABLE \`teams\` DROP FOREIGN KEY \`FK_557f2628febfe2a8c792b95b0e0\`
        `);
        await queryRunner.query(`
            ALTER TABLE \`leader_profiles\` DROP FOREIGN KEY \`FK_9d87629e7fe332a5177a79f6c31\`
        `);
        await queryRunner.query(`
            ALTER TABLE \`member_profiles\` DROP FOREIGN KEY \`FK_71f045ea73b7e7e39e6b6508db3\`
        `);
        await queryRunner.query(`
            ALTER TABLE \`member_profiles\` DROP FOREIGN KEY \`FK_1533e17073707a6aaa401ef32e8\`
        `);
        await queryRunner.query(`
            DROP INDEX \`IDX_02b5e590f07c914af3f08e38ce\` ON \`leader_teams\`
        `);
        await queryRunner.query(`
            DROP INDEX \`IDX_a3381fc9f0d34204f023cef598\` ON \`leader_teams\`
        `);
        await queryRunner.query(`
            DROP TABLE \`leader_teams\`
        `);
        await queryRunner.query(`
            DROP INDEX \`UQ_visit_report_schedule\` ON \`visit_reports\`
        `);
        await queryRunner.query(`
            DROP TABLE \`visit_reports\`
        `);
        await queryRunner.query(`
            DROP INDEX \`REL_cc51378a6c1b00955bdd190ed7\` ON \`visit_material_pages\`
        `);
        await queryRunner.query(`
            DROP TABLE \`visit_material_pages\`
        `);
        await queryRunner.query(`
            DROP INDEX \`REL_96d989f11cea25c620480f1a81\` ON \`videos_pages\`
        `);
        await queryRunner.query(`
            DROP TABLE \`videos_pages\`
        `);
        await queryRunner.query(`
            DROP INDEX \`REL_b6202d1cacc63a0b9c8dac2abd\` ON \`user_preferences\`
        `);
        await queryRunner.query(`
            DROP TABLE \`user_preferences\`
        `);
        await queryRunner.query(`
            DROP TABLE \`site_feedbacks\`
        `);
        await queryRunner.query(`
            DROP INDEX \`REL_f9806706370e043fd63608ef9d\` ON \`personal_data\`
        `);
        await queryRunner.query(`
            DROP TABLE \`personal_data\`
        `);
        await queryRunner.query(`
            DROP TABLE \`password_reset_tokens\`
        `);
        await queryRunner.query(`
            DROP TABLE \`media_items\`
        `);
        await queryRunner.query(`
            DROP TABLE \`integrations\`
        `);
        await queryRunner.query(`
            DROP INDEX \`REL_53aaf0a1d918030b728e40e02b\` ON \`informatives\`
        `);
        await queryRunner.query(`
            DROP TABLE \`informatives\`
        `);
        await queryRunner.query(`
            DROP INDEX \`REL_731a6abb597e960c82a19302f3\` ON \`image_pages\`
        `);
        await queryRunner.query(`
            DROP TABLE \`image_pages\`
        `);
        await queryRunner.query(`
            DROP TABLE \`image_sections\`
        `);
        await queryRunner.query(`
            DROP INDEX \`REL_e93c29cf0e680a8e23e3c9d295\` ON \`ideas_pages\`
        `);
        await queryRunner.query(`
            DROP TABLE \`ideas_pages\`
        `);
        await queryRunner.query(`
            DROP TABLE \`ideas_sections\`
        `);
        await queryRunner.query(`
            DROP INDEX \`IDX_36d0344370584b4d6a953c53a6\` ON \`feature_flags\`
        `);
        await queryRunner.query(`
            DROP TABLE \`feature_flags\`
        `);
        await queryRunner.query(`
            DROP INDEX \`IDX_10f285d038feb767bf7c2da14b\` ON \`email_verification_tokens\`
        `);
        await queryRunner.query(`
            DROP INDEX \`IDX_3d1613f95c6a564a3b588d161a\` ON \`email_verification_tokens\`
        `);
        await queryRunner.query(`
            DROP TABLE \`email_verification_tokens\`
        `);
        await queryRunner.query(`
            DROP INDEX \`IDX_ce187f180f5a0c1f9cf7acb991\` ON \`email_outbox\`
        `);
        await queryRunner.query(`
            DROP INDEX \`IDX_7df3c823b1c1b78e23ed1c6636\` ON \`email_outbox\`
        `);
        await queryRunner.query(`
            DROP TABLE \`email_outbox\`
        `);
        await queryRunner.query(`
            DROP INDEX \`REL_15ac883805e4c80918f4a26d9d\` ON \`documents\`
        `);
        await queryRunner.query(`
            DROP TABLE \`documents\`
        `);
        await queryRunner.query(`
            DROP TABLE \`meditation_days\`
        `);
        await queryRunner.query(`
            DROP TABLE \`meditations\`
        `);
        await queryRunner.query(`
            DROP TABLE \`contacts\`
        `);
        await queryRunner.query(`
            DROP TABLE \`comments\`
        `);
        await queryRunner.query(`
            DROP TABLE \`attendance_records\`
        `);
        await queryRunner.query(`
            DROP TABLE \`shelter_schedules\`
        `);
        await queryRunner.query(`
            DROP TABLE \`events\`
        `);
        await queryRunner.query(`
            DROP TABLE \`atendentes\`
        `);
        await queryRunner.query(`
            DROP TABLE \`accepted_christs\`
        `);
        await queryRunner.query(`
            DROP INDEX \`REL_20a8559e0ff43ab951b0f51584\` ON \`sheltered\`
        `);
        await queryRunner.query(`
            DROP TABLE \`sheltered\`
        `);
        await queryRunner.query(`
            DROP INDEX \`UQ_pagela_sheltered_year_visit\` ON \`pagelas\`
        `);
        await queryRunner.query(`
            DROP TABLE \`pagelas\`
        `);
        await queryRunner.query(`
            DROP INDEX \`REL_379bc21f2e9f465794ef4c24a1\` ON \`shelters\`
        `);
        await queryRunner.query(`
            DROP INDEX \`REL_23aee355a2aad14acf0f2822f4\` ON \`shelters\`
        `);
        await queryRunner.query(`
            DROP TABLE \`shelters\`
        `);
        await queryRunner.query(`
            DROP INDEX \`IDX_6991954a7bed07733ce954bb89\` ON \`routes\`
        `);
        await queryRunner.query(`
            DROP TABLE \`routes\`
        `);
        await queryRunner.query(`
            DROP TABLE \`teams\`
        `);
        await queryRunner.query(`
            DROP INDEX \`REL_9d87629e7fe332a5177a79f6c3\` ON \`leader_profiles\`
        `);
        await queryRunner.query(`
            DROP INDEX \`UQ_leader_profile_user\` ON \`leader_profiles\`
        `);
        await queryRunner.query(`
            DROP TABLE \`leader_profiles\`
        `);
        await queryRunner.query(`
            DROP INDEX \`IDX_97672ac88f789774dd47f7c8be\` ON \`users\`
        `);
        await queryRunner.query(`
            DROP TABLE \`users\`
        `);
        await queryRunner.query(`
            DROP INDEX \`REL_71f045ea73b7e7e39e6b6508db\` ON \`member_profiles\`
        `);
        await queryRunner.query(`
            DROP INDEX \`UQ_member_profile_user\` ON \`member_profiles\`
        `);
        await queryRunner.query(`
            DROP TABLE \`member_profiles\`
        `);
        await queryRunner.query(`
            DROP TABLE \`addresses\`
        `);
    }

}
