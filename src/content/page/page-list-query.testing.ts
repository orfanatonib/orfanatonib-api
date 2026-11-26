/** Dublê encadeável de `SelectQueryBuilder` para os specs dos repositórios de página. */
export interface FakeQb {
  calls: { method: string; args: unknown[] }[];
  where: string[];
  params: Record<string, unknown>;
  clone: jest.Mock;
  select: jest.Mock;
  andWhere: jest.Mock;
  orderBy: jest.Mock;
  addOrderBy: jest.Mock;
  offset: jest.Mock;
  limit: jest.Mock;
  getMany: jest.Mock;
  getCount: jest.Mock;
}

export function fakeQb(rows: { id: string }[], count = rows.length): FakeQb {
  const qb = {
    calls: [] as FakeQb["calls"],
    where: [] as string[],
    params: {} as Record<string, unknown>,
  } as FakeQb;
  const chain = (method: string) =>
    jest.fn((...args: unknown[]) => {
      qb.calls.push({ method, args });
      return qb;
    });
  qb.clone = jest.fn(() => qb);
  qb.select = chain("select");
  qb.orderBy = chain("orderBy");
  qb.addOrderBy = chain("addOrderBy");
  qb.offset = chain("offset");
  qb.limit = chain("limit");
  qb.andWhere = jest.fn((clause: string, params?: Record<string, unknown>) => {
    qb.where.push(clause);
    Object.assign(qb.params, params);
    return qb;
  });
  qb.getMany = jest.fn(() => Promise.resolve(rows));
  qb.getCount = jest.fn(() => Promise.resolve(count));
  return qb;
}

export const callsOf = (qb: FakeQb, method: string) =>
  qb.calls.filter((call) => call.method === method).map((call) => call.args);
