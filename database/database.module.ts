import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { DatabaseLoggerService } from "./database-logger.service";
import { createDatabaseOptions } from "./database.config";

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) =>
        createDatabaseOptions({
          DB_HOST: configService.get<string>("DB_HOST"),
          DB_PORT: configService.get<string>("DB_PORT"),
          DB_USERNAME: configService.get<string>("DB_USERNAME"),
          DB_PASSWORD: configService.get<string>("DB_PASSWORD"),
          DB_NAME: configService.get<string>("DB_NAME"),
        }),
    }),
  ],
  providers: [DatabaseLoggerService],
})
export class DatabaseModule {}
