import { MigrationInterface, QueryRunner } from "typeorm";

export class AddContentPackageCover1795211491305 implements MigrationInterface {
    name = 'AddContentPackageCover1795211491305'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`content_packages\` ADD \`coverImageUrl\` varchar(500) NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`content_packages\` DROP COLUMN \`coverImageUrl\``);
    }

}
