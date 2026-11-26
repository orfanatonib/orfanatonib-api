export enum HealthStatus {
  OK = "ok",
  UNAVAILABLE = "unavailable",
}

export const HEALTH_READINESS_TIMEOUT_MS = 2000;

export interface HealthReadiness {
  status: HealthStatus;
  timestamp: string;
  checks: { database: HealthStatus };
  durationMs: number;
}
