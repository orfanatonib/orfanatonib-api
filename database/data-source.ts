import "reflect-metadata";
import { DataSource } from "typeorm";
import { createDatabaseOptions } from "./database.config";

export default new DataSource(
  createDatabaseOptions({
    DB_HOST: process.env.DB_HOST,
    DB_PORT: process.env.DB_PORT,
    DB_USERNAME: process.env.DB_USERNAME,
    DB_PASSWORD: process.env.DB_PASSWORD,
    DB_NAME: process.env.DB_NAME,
  }),
);
