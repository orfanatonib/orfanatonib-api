import { createDatabaseOptions } from "../database/database.config";
import { DATABASE_ENTITIES } from "../database/database.entities";

describe("createDatabaseOptions", () => {
  it("creates safe CLI options with migrations and synchronization disabled", () => {
    const options = createDatabaseOptions({
      DB_HOST: "database.test",
      DB_PORT: "3307",
      DB_USERNAME: "test-user",
      DB_PASSWORD: "test-password",
      DB_NAME: "test-database",
    });

    expect(options).toMatchObject({
      type: "mysql",
      host: "database.test",
      port: 3307,
      username: "test-user",
      password: "test-password",
      database: "test-database",
      entities: DATABASE_ENTITIES,
      migrationsTableName: "typeorm_migrations",
      synchronize: false,
      migrationsRun: false,
      dropSchema: false,
    });
    expect(options.migrations).toHaveLength(1);
  });

  it("never synchronizes entities, runs migrations on boot or drops the schema", () => {
    const options = createDatabaseOptions({});

    expect(options.synchronize).toBe(false);
    expect(options.migrationsRun).toBe(false);
    expect(options.dropSchema).toBe(false);
  });

  it.each(["0", "65536", "invalid"])("rejects invalid DB_PORT %s", (port) => {
    expect(() => createDatabaseOptions({ DB_PORT: port })).toThrow(
      "DB_PORT must be an integer between 1 and 65535",
    );
  });
});
