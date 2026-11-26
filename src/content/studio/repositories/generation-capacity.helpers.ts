import { DataSource, EntityManager, In } from "typeorm";

import { ResourceConflictException } from "src/common/exceptions";

import { GENERATION_CAPACITY } from "../constants";
import { ContentGenerationJobEntity } from "../entities/content-generation-job.entity";
import { ACTIVE_CONTENT_GENERATION_JOB_STATUSES } from "../types";

/** Código estável que a tela usa para explicar por que a geração não começou. */
export const GENERATION_CAPACITY_ERROR_CODE = "GENERATION_CAPACITY";

export type GenerationCapacityReason = "CATEGORY_BUSY" | "PACKAGE_LIMIT";

export interface ActiveGenerationSlot {
  readonly packageId: string;
  readonly trackId: string;
}

export interface GenerationCapacityLimits {
  readonly maxPerCategory: number;
  readonly maxPackages: number;
}

/**
 * Decide, a partir das gerações ativas, se uma nova na categoria (`trackId`) do material (`packageId`) cabe.
 * Função pura: a transação só precisa lê-las e aplicar o veredito.
 */
export function evaluateGenerationCapacity(
  active: readonly ActiveGenerationSlot[],
  target: ActiveGenerationSlot,
  limits: GenerationCapacityLimits = GENERATION_CAPACITY,
): GenerationCapacityReason | null {
  const inCategory = active.filter((slot) => slot.trackId === target.trackId);
  if (inCategory.length >= limits.maxPerCategory) return "CATEGORY_BUSY";
  const packages = new Set(active.map((slot) => slot.packageId));
  if (!packages.has(target.packageId) && packages.size >= limits.maxPackages)
    return "PACKAGE_LIMIT";
  return null;
}

const CAPACITY_MESSAGES: Record<GenerationCapacityReason, string> = {
  CATEGORY_BUSY:
    "Já existe uma geração em andamento nesta categoria. Aguarde ela terminar para iniciar outra.",
  PACKAGE_LIMIT: `O Estúdio já está gerando ${GENERATION_CAPACITY.maxPackages} materiais para visita ao mesmo tempo. Aguarde um deles terminar para iniciar outro.`,
};

/** Gerações ativas de todo o Estúdio (uma linha por job ativo), na visão do `manager` (a transação atual). */
export async function findActiveGenerationSlots(
  manager: EntityManager,
): Promise<ActiveGenerationSlot[]> {
  const rows = await manager
    .createQueryBuilder(ContentGenerationJobEntity, "job")
    .innerJoin("content_stages", "stage", "stage.id = job.stage_id")
    .innerJoin("content_tracks", "track", "track.id = stage.track_id")
    .select("track.id", "trackId")
    .addSelect("track.package_id", "packageId")
    .where({ status: In([...ACTIVE_CONTENT_GENERATION_JOB_STATUSES]) })
    .getRawMany<{ trackId: string; packageId: string }>();
  return rows.map((row) => ({
    trackId: row.trackId,
    packageId: row.packageId,
  }));
}

/** Lança 409 (`GENERATION_CAPACITY`) se a nova geração não couber nos limites do Estúdio. */
export async function assertGenerationCapacity(
  manager: EntityManager,
  target: ActiveGenerationSlot,
): Promise<void> {
  const reason = evaluateGenerationCapacity(
    await findActiveGenerationSlots(manager),
    target,
  );
  if (!reason) return;
  throw new ResourceConflictException(CAPACITY_MESSAGES[reason], {
    code: GENERATION_CAPACITY_ERROR_CODE,
    reason,
    limits: {
      maxPerCategory: GENERATION_CAPACITY.maxPerCategory,
      maxPackages: GENERATION_CAPACITY.maxPackages,
      maxTotal: GENERATION_CAPACITY.maxTotal,
    },
  });
}

/**
 * Roda `work` com a trava nomeada do MySQL: dois pedidos simultâneos (de qualquer administrador ou instância da API)
 * nunca checam a capacidade ao mesmo tempo. A trava é adquirida ANTES da transação de `work` e liberada DEPOIS do commit,
 * para o próximo pedido já enxergar o job criado.
 */
export async function withGenerationCapacityLock<T>(
  dataSource: DataSource,
  work: () => Promise<T>,
): Promise<T> {
  const runner = dataSource.createQueryRunner();
  await runner.connect();
  try {
    const [row] = (await runner.query("SELECT GET_LOCK(?, ?) AS acquired", [
      GENERATION_CAPACITY.lockName,
      GENERATION_CAPACITY.lockWaitSeconds,
    ])) as Array<{ acquired: number | string | null }>;
    if (Number(row?.acquired) !== 1)
      throw new ResourceConflictException(
        "O Estúdio está processando outro pedido de geração. Tente de novo em instantes.",
        { code: GENERATION_CAPACITY_ERROR_CODE, reason: "LOCK_TIMEOUT" },
      );
    try {
      return await work();
    } finally {
      await runner
        .query("SELECT RELEASE_LOCK(?)", [GENERATION_CAPACITY.lockName])
        .catch(() => undefined);
    }
  } finally {
    await runner.release();
  }
}
