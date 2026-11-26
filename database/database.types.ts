export interface DatabaseEnvironment {
  readonly DB_HOST?: string;
  readonly DB_PORT?: string | number;
  readonly DB_USERNAME?: string;
  readonly DB_PASSWORD?: string;
  readonly DB_NAME?: string;
}
