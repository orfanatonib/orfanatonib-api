import { MigrationInterface, QueryRunner } from "typeorm";
import { RenameIntegrationFeatureFlag1795350000000 } from "./legacy/1795350000000-RenameIntegrationFeatureFlag";
import { ForceIdeasPagesPrivate1795360000000 } from "./legacy/1795360000000-ForceIdeasPagesPrivate";

/** Data-only policies retained when consolidating the historical schema chain. */
export class ReleaseDataPolicies1795459201000 implements MigrationInterface {
  name = "ReleaseDataPolicies1795459201000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await new RenameIntegrationFeatureFlag1795350000000().up(queryRunner);
    await new ForceIdeasPagesPrivate1795360000000().up(queryRunner);
  }

  async down(): Promise<void> {
    throw new Error("Data policies are irreversible; restore the verified pre-deploy backup.");
  }
}
