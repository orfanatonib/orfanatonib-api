import { Controller, Get, ServiceUnavailableException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { DataSource } from "typeorm";

import {
  HEALTH_READINESS_TIMEOUT_MS,
  HealthReadiness,
  HealthStatus,
} from "./health.types";

export interface HealthLiveness {
  status: HealthStatus;
  timestamp: string;
  uptime: number;
  /** "fake" quando o LLM é simulado (E2E); os testes de geração só rodam nesse modo. */
  aiProviderMode: string;
}

@Controller("health")
export class HealthController {
  constructor(
    private readonly dataSource: DataSource,
    private readonly config: ConfigService,
  ) {}

  /** Liveness: o processo responde. Não depende de banco nem mede memória. */
  @Get()
  getHealth(): HealthLiveness {
    return {
      status: HealthStatus.OK,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      aiProviderMode:
        this.config.get<string>("AI_PROVIDER_MODE") === "fake"
          ? "fake"
          : "live",
    };
  }

  /** Readiness: o banco responde dentro do prazo. */
  @Get("ready")
  async getReadiness(): Promise<HealthReadiness> {
    const startedAt = Date.now();
    try {
      await Promise.race([
        this.dataSource.query("SELECT 1"),
        new Promise<never>((_, reject) =>
          setTimeout(
            () => reject(new Error("timeout")),
            HEALTH_READINESS_TIMEOUT_MS,
          ).unref(),
        ),
      ]);
    } catch {
      throw new ServiceUnavailableException({
        status: HealthStatus.UNAVAILABLE,
        checks: { database: HealthStatus.UNAVAILABLE },
      });
    }
    return {
      status: HealthStatus.OK,
      timestamp: new Date().toISOString(),
      checks: { database: HealthStatus.OK },
      durationMs: Date.now() - startedAt,
    };
  }
}
