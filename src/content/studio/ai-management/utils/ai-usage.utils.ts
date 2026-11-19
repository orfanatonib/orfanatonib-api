import type {
  AiUsageByModelDto,
  AiUsageResponseDto,
} from "../dto/ai-usage-response.dto";

/** O que o Estúdio guarda em `generationSnapshot` de cada versão gerada. */
export interface GenerationSnapshotRow {
  provider?: unknown;
  model?: unknown;
  usage?: {
    inputTokens?: unknown;
    outputTokens?: unknown;
    totalTokens?: unknown;
  } | null;
  durationMs?: unknown;
}

const count = (value: unknown): number =>
  typeof value === "number" && Number.isFinite(value) && value > 0
    ? Math.round(value)
    : 0;

/** Soma as gerações por provedor/modelo (snapshots sem provedor ou modelo são ignorados). */
export function aggregateAiUsage(
  rows: readonly GenerationSnapshotRow[],
  days: number,
  since: Date,
): AiUsageResponseDto {
  const groups = new Map<string, AiUsageByModelDto & { durationSum: number }>();
  for (const row of rows) {
    if (typeof row.provider !== "string" || typeof row.model !== "string")
      continue;
    const key = `${row.provider}::${row.model}`;
    const group = groups.get(key) ?? {
      provider: row.provider,
      model: row.model,
      generations: 0,
      inputTokens: 0,
      outputTokens: 0,
      totalTokens: 0,
      averageDurationMs: 0,
      durationSum: 0,
    };
    const input = count(row.usage?.inputTokens);
    const output = count(row.usage?.outputTokens);
    group.generations += 1;
    group.inputTokens += input;
    group.outputTokens += output;
    group.totalTokens += count(row.usage?.totalTokens) || input + output;
    group.durationSum += count(row.durationMs);
    groups.set(key, group);
  }
  const byModel = [...groups.values()]
    .map(({ durationSum, ...group }) => ({
      ...group,
      averageDurationMs: Math.round(durationSum / group.generations),
    }))
    .sort(
      (a, b) => b.totalTokens - a.totalTokens || b.generations - a.generations,
    );
  return {
    days,
    since: since.toISOString(),
    generations: byModel.reduce((sum, item) => sum + item.generations, 0),
    totalTokens: byModel.reduce((sum, item) => sum + item.totalTokens, 0),
    byModel,
  };
}
