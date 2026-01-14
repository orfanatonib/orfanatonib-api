import { Controller, Get } from '@nestjs/common';

interface HealthCheckResponse {
  status: 'ok' | 'error';
  timestamp: string;
  uptime: number;
  memory: {
    used: number;
    total: number;
    percentage: number;
  };
  version: string;
}

@Controller('health')
export class HealthController {
  @Get()
  getHealth(): HealthCheckResponse {
    const memUsage = process.memoryUsage();
    const totalMem = memUsage.heapTotal;
    const usedMem = memUsage.heapUsed;
    const memPercentage = ((usedMem / totalMem) * 100);

    if (memPercentage > 90) {
      throw new Error('High memory usage detected');
    }

    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: {
        used: usedMem,
        total: totalMem,
        percentage: Math.round(memPercentage * 100) / 100,
      },
      version: process.env.npm_package_version || '1.0.0',
    };
  }

  @Get('detailed')
  async getDetailedHealth(): Promise<any> {
    const basicHealth = this.getHealth();

    return {
      ...basicHealth,
      services: {
        database: 'unknown',
        cache: 'unknown',
        externalApis: 'unknown',
      },
      environment: {
        nodeVersion: process.version,
        environment: process.env.NODE_ENV || 'development',
        platform: process.platform,
      },
    };
  }
}
