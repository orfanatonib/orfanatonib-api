import "reflect-metadata";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { GetUsersQueryDto } from "./dto/get-users-query.dto";
import { UserRepository } from "./user.repository";

function fakeQb() {
  const qb: Record<string, jest.Mock> = {};
  for (const m of ["select", "andWhere", "orderBy", "skip", "take"]) {
    qb[m] = jest.fn().mockReturnValue(qb);
  }
  qb.getManyAndCount = jest.fn().mockResolvedValue([[], 0]);
  return qb;
}

async function errorsFor(plain: Record<string, unknown>) {
  const dto = plainToInstance(GetUsersQueryDto, plain);
  return (
    await validate(dto, { whitelist: true, forbidNonWhitelisted: true })
  ).map((e) => e.property);
}

describe("GET /users: filtro de criação", () => {
  it("aceita createdFrom/createdTo no formato AAAA-MM-DD", async () => {
    expect(
      await errorsFor({ createdFrom: "2026-01-01", createdTo: "2026-01-31" }),
    ).toEqual([]);
  });

  it.each(["01/01/2026", "ontem", "2026-13-40"])(
    "rejeita createdFrom inválido (%s)",
    async (value) => {
      expect(await errorsFor({ createdFrom: value })).toContain("createdFrom");
    },
  );

  it("aplica o intervalo no banco, com o dia final inclusivo", async () => {
    const qb = fakeQb();
    const repo = new UserRepository({ createQueryBuilder: () => qb } as never);

    await repo.findAllPaginated({
      page: 1,
      limit: 12,
      createdFrom: "2026-01-01",
      createdTo: "2026-01-31",
      sort: "updatedAt",
      order: "DESC",
    } as GetUsersQueryDto);

    expect(qb.andWhere).toHaveBeenCalledWith("u.createdAt >= :createdFrom", {
      createdFrom: new Date("2026-01-01T00:00:00.000"),
    });
    expect(qb.andWhere).toHaveBeenCalledWith("u.createdAt <= :createdTo", {
      createdTo: new Date("2026-01-31T23:59:59.999"),
    });
  });

  it("sem datas não acrescenta condição de criação", async () => {
    const qb = fakeQb();
    const repo = new UserRepository({ createQueryBuilder: () => qb } as never);

    await repo.findAllPaginated({ page: 1, limit: 12 } as GetUsersQueryDto);

    const sql = qb.andWhere.mock.calls.map((c) => String(c[0])).join(" ");
    expect(sql).not.toContain("createdAt");
  });
});
