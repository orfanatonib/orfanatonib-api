import { GENERATION_CAPACITY } from "../constants";
import type { GenerationActivityRow } from "../repositories/generation-activity.repository";

export interface GenerationActivityItem {
  jobId: string;
  stageId: string;
  packageId: string;
  theme: string;
  biblicalReferences: string;
  trackId: string;
  audience: string;
  stageType: string;
  capability: string;
  status: string;
  attempts: number;
  progress: Record<string, unknown> | null;
  errorCode: string | null;
  startedAt: string;
  updatedAt: string;
  heartbeatAt: string | null;
}

export interface GenerationFinishedItem extends GenerationActivityItem {
  durationMs: number;
}

export interface GenerationActivityResponse {
  limits: {
    maxPerCategory: number;
    maxPackages: number;
    maxTotal: number;
  };
  usage: {
    activeJobs: number;
    activeCategories: number;
    activePackages: number;
    /** Categorias que ainda podem iniciar uma geração agora (considerando os dois limites). */
    freeCategorySlots: number;
    /** Materiais que ainda podem entrar em geração. */
    freePackageSlots: number;
  };
  active: GenerationActivityItem[];
  recent: GenerationFinishedItem[];
  last24h: {
    succeeded: number;
    failed: number;
    cancelled: number;
    averageDurationMs: number | null;
  };
}

const iso = (value: Date | string): string => new Date(value).toISOString();

function parseProgress(
  value: GenerationActivityRow["progress"],
): Record<string, unknown> | null {
  if (!value) return null;
  if (typeof value !== "string") return value;
  try {
    const parsed: unknown = JSON.parse(value);
    return parsed && typeof parsed === "object"
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

export function toActivityItem(
  row: GenerationActivityRow,
): GenerationActivityItem {
  return {
    jobId: row.jobId,
    stageId: row.stageId,
    packageId: row.packageId,
    theme: row.theme,
    biblicalReferences: row.biblicalReferences,
    trackId: row.trackId,
    audience: row.audience,
    stageType: row.stageType,
    capability: row.capability,
    status: row.status,
    attempts: Number(row.attempts),
    progress: parseProgress(row.progress),
    errorCode: row.errorCode ?? null,
    startedAt: iso(row.createdAt),
    updatedAt: iso(row.updatedAt),
    heartbeatAt: row.heartbeatAt ? iso(row.heartbeatAt) : null,
  };
}

/** Monta a visão do Estúdio: o que está gerando, o quanto ainda cabe e o que terminou nas últimas 24 horas. */
export function buildGenerationActivity(
  activeRows: readonly GenerationActivityRow[],
  recentRows: readonly GenerationActivityRow[],
): GenerationActivityResponse {
  const active = activeRows.map(toActivityItem);
  const categories = new Set(active.map((item) => item.trackId));
  const packages = new Set(active.map((item) => item.packageId));
  const recentAll: GenerationFinishedItem[] = recentRows.map((row) => ({
    ...toActivityItem(row),
    durationMs: Math.max(
      0,
      new Date(row.updatedAt).getTime() - new Date(row.createdAt).getTime(),
    ),
  }));
  const succeeded = recentAll.filter((item) => item.status === "SUCCEEDED");
  return {
    limits: {
      maxPerCategory: GENERATION_CAPACITY.maxPerCategory,
      maxPackages: GENERATION_CAPACITY.maxPackages,
      maxTotal: GENERATION_CAPACITY.maxTotal,
    },
    usage: {
      activeJobs: active.length,
      activeCategories: categories.size,
      activePackages: packages.size,
      freeCategorySlots: Math.max(
        0,
        GENERATION_CAPACITY.maxTotal - categories.size,
      ),
      freePackageSlots: Math.max(
        0,
        GENERATION_CAPACITY.maxPackages - packages.size,
      ),
    },
    active,
    recent: recentAll.slice(0, 30),
    last24h: {
      succeeded: succeeded.length,
      failed: recentAll.filter((item) => item.status === "FAILED").length,
      cancelled: recentAll.filter((item) => item.status === "CANCELLED").length,
      averageDurationMs: succeeded.length
        ? Math.round(
            succeeded.reduce((sum, item) => sum + item.durationMs, 0) /
              succeeded.length,
          )
        : null,
    },
  };
}
