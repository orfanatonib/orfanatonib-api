import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { DataSource } from 'typeorm';

@Injectable()
export class DatabaseLoggerService implements OnApplicationBootstrap {
  private readonly logger = new Logger('Database');

  constructor(private dataSource: DataSource) {}

  async onApplicationBootstrap() {
    try {
      if (!this.dataSource.isInitialized) {
        this.logger.warn('Database not initialized');
      }
    } catch (error) {
      this.logger.error('Error checking database connection:', error);
    }
  }
}
