import { join } from "path";
import { MysqlConnectionOptions } from "typeorm/driver/mysql/MysqlConnectionOptions";
import {
  DATABASE_MIGRATIONS_TABLE,
  DEFAULT_DATABASE_HOST,
  DEFAULT_DATABASE_NAME,
  DEFAULT_DATABASE_PASSWORD,
  DEFAULT_DATABASE_PORT,
  DEFAULT_DATABASE_USERNAME,
} from "./database.constants";
import { DATABASE_ENTITIES } from "./database.entities";
import {
  DatabaseEnvironment,
  DatabaseOptionsOverrides,
} from "./database.types";

function parseDatabasePort(value: string | number | undefined): number {
  if (value === undefined) {
    return DEFAULT_DATABASE_PORT;
  }

  const port = Number(value);

  if (!Number.isInteger(port) || port <= 0 || port > 65535) {
    throw new Error("DB_PORT must be an integer between 1 and 65535");
  }

  return port;
}

export function createDatabaseOptions(
  environment: DatabaseEnvironment,
  overrides: DatabaseOptionsOverrides = {},
): MysqlConnectionOptions {
  return {
    type: "mysql",
    host: environment.DB_HOST ?? DEFAULT_DATABASE_HOST,
    port: parseDatabasePort(environment.DB_PORT),
    username: environment.DB_USERNAME ?? DEFAULT_DATABASE_USERNAME,
    password: environment.DB_PASSWORD ?? DEFAULT_DATABASE_PASSWORD,
    database: environment.DB_NAME ?? DEFAULT_DATABASE_NAME,
    entities: DATABASE_ENTITIES,
    migrations: [join(__dirname, "migrations", "*{.ts,.js}")],
    migrationsTableName: DATABASE_MIGRATIONS_TABLE,
    synchronize: overrides.synchronize ?? false,
  };
}
