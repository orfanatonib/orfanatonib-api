/** Dublê encadeável de `SelectQueryBuilder` (getManyAndCount) para os specs dos repositórios. */
export interface RecordingQb {
  calls: { method: string; args: unknown[] }[];
  clauses: string[];
  params: Record<string, unknown>;
  [method: string]: unknown;
}

export function recordingQb(
  rows: unknown[] = [],
  total = rows.length,
): RecordingQb {
  const qb = {
    calls: [] as RecordingQb["calls"],
    clauses: [] as string[],
    params: {} as Record<string, unknown>,
  } as RecordingQb;
  const chain = (method: string) =>
    jest.fn((...args: unknown[]) => {
      qb.calls.push({ method, args });
      if (method === "where" || method === "andWhere") {
        qb.clauses.push(String(args[0]));
        Object.assign(
          qb.params,
          args[1] as Record<string, unknown> | undefined,
        );
      }
      return qb;
    });
  for (const method of [
    "leftJoinAndSelect",
    "leftJoin",
    "innerJoinAndSelect",
    "innerJoin",
    "where",
    "andWhere",
    "orderBy",
    "addOrderBy",
    "skip",
    "take",
  ]) {
    qb[method] = chain(method);
  }
  qb.getManyAndCount = jest.fn(() => Promise.resolve([rows, total]));
  return qb;
}

export const qbCalls = (qb: RecordingQb, method: string): unknown[][] =>
  qb.calls.filter((call) => call.method === method).map((call) => call.args);
