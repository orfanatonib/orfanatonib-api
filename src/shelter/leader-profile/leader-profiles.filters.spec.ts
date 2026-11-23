import "reflect-metadata";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { LeaderProfilesQueryDto } from "./dto/leader-profiles.query.dto";
import { LeaderProfilesRepository } from "./repositories/leader-profiles.repository";

const SHELTER = "3f2b8f0e-5b0a-4d2c-8d57-0a1f6f2f9a11";

async function errorsFor(plain: Record<string, unknown>) {
  const dto = plainToInstance(LeaderProfilesQueryDto, plain);
  return (
    await validate(dto, { whitelist: true, forbidNonWhitelisted: true })
  ).map((e) => e.property);
}

function fakeQb() {
  const qb: Record<string, jest.Mock> = {};
  for (const m of [
    "leftJoin",
    "where",
    "andWhere",
    "select",
    "addSelect",
    "distinct",
    "orderBy",
    "offset",
    "limit",
  ]) {
    qb[m] = jest.fn().mockReturnValue(qb);
  }
  qb.getCount = jest.fn().mockResolvedValue(0);
  qb.getRawMany = jest.fn().mockResolvedValue([]);
  return qb;
}

describe("GET /leader-profiles: filtros por abrigo e criação", () => {
  it("aceita shelterId, createdFrom e createdTo", async () => {
    expect(
      await errorsFor({
        shelterId: SHELTER,
        createdFrom: "2026-01-01",
        createdTo: "2026-02-01",
      }),
    ).toEqual([]);
  });

  it("rejeita shelterId que não é UUID e datas inválidas", async () => {
    expect(await errorsFor({ shelterId: "abc" })).toContain("shelterId");
    expect(await errorsFor({ createdTo: "31/01/2026" })).toContain("createdTo");
  });

  it("aplica abrigo exato e intervalo de criação no banco", async () => {
    const qb = fakeQb();
    const repo = new LeaderProfilesRepository(
      {} as never,
      { createQueryBuilder: () => qb } as never,
      {} as never,
      {} as never,
    );

    await repo.findPageWithFilters(
      plainToInstance(LeaderProfilesQueryDto, {
        shelterId: SHELTER,
        createdFrom: "2026-01-01",
        createdTo: "2026-01-31",
      }),
    );

    const calls = qb.andWhere.mock.calls;
    expect(
      calls.some(
        ([sql, params]) =>
          String(sql).includes("t.shelter_id = :filterShelterId") &&
          (params as { filterShelterId: string }).filterShelterId === SHELTER,
      ),
    ).toBe(true);
    expect(calls).toContainEqual([
      "leader.createdAt >= :createdFrom",
      { createdFrom: new Date("2026-01-01T00:00:00.000") },
    ]);
    expect(calls).toContainEqual([
      "leader.createdAt <= :createdTo",
      { createdTo: new Date("2026-01-31T23:59:59.999") },
    ]);
  });
});
