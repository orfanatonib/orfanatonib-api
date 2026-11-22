import { MigrationInterface, QueryRunner } from "typeorm";

export class TeamsUniqueNumberPerShelter1795344983337 implements MigrationInterface {
    name = 'TeamsUniqueNumberPerShelter1795344983337'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE UNIQUE INDEX \`UQ_teams_shelter_number\` ON \`teams\` (\`shelter_id\`, \`numberTeam\`)`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX \`UQ_teams_shelter_number\` ON \`teams\``);
    }

}
