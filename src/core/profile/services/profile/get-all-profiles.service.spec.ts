import { UserRole } from "../../../auth/auth.types";
import { GetAllProfilesService } from "./get-all-profiles.service";

type QueryCall = [string, unknown[]];

function setup(rows: object[] = [], total = rows.length) {
  const query = jest.fn((sql: string): Promise<unknown> => {
    return Promise.resolve(
      sql.includes("COUNT(DISTINCT") ? [{ total: String(total) }] : rows,
    );
  });
  const dataSource = { query };
  const personal = {
    findByUserId: jest.fn().mockResolvedValue({
      birthDate: new Date("1990-05-17T00:00:00.000Z"),
      gender: "F",
    }),
  };
  const prefs = { findByUserId: jest.fn().mockResolvedValue(null) };
  const media = {
    findManyMediaItemsByTargets: jest.fn().mockResolvedValue([]),
  };
  const svc = new GetAllProfilesService(
    dataSource as never,
    {} as never,
    personal as never,
    prefs as never,
    media as never,
  );
  const calls = (): QueryCall[] => query.mock.calls as unknown as QueryCall[];
  return { svc, query, calls, personal, media };
}

const user = (id: string) => ({
  id,
  email: `${id}@x.test`,
  phone: "9",
  name: `Nome ${id}`,
  role: "member",
});

describe("GetAllProfilesService: escopo por papel", () => {
  it("membro não lista ninguém e nenhum SQL é executado", async () => {
    const { svc, query, media } = setup([user("u1")]);

    const result = await svc.execute("m1", UserRole.MEMBER, {});

    expect(result.items).toEqual([]);
    expect(result.meta.totalItems).toBe(0);
    expect(query).not.toHaveBeenCalled();
    expect(media.findManyMediaItemsByTargets).toHaveBeenCalledWith(
      [],
      "UserEntity",
    );
  });

  it("admin lista sem restrição de equipe", async () => {
    const { svc, calls } = setup([user("u1")]);

    await svc.execute("a1", UserRole.ADMIN, {});

    const [sql, params] = calls()[0];
    expect(sql).toContain("WHERE 1=1");
    expect(sql).not.toContain("lp.user_id");
    expect(params).toEqual([10, 0]);
  });

  it("líder só vê membros das equipes que lidera (filtra pelo próprio user_id)", async () => {
    const { svc, calls } = setup([user("u1")]);

    await svc.execute("lider-1", UserRole.LEADER, {});

    const [sql, params] = calls()[0];
    expect(sql).toContain("INNER JOIN leader_teams");
    expect(sql).toContain("lp.user_id = ?");
    expect(params[0]).toBe("lider-1");
  });
});

describe("GetAllProfilesService: filtros e ordenação", () => {
  it("busca livre vira dois LIKE parametrizados (nunca no texto do SQL)", async () => {
    const { svc, calls } = setup([]);

    await svc.execute("a1", UserRole.ADMIN, { q: "ana'; DROP TABLE users;--" });

    const [sql, params] = calls()[0];
    expect(sql).toContain("(u.name LIKE ? OR u.email LIKE ?)");
    expect(sql).not.toContain("DROP TABLE");
    expect(params.slice(0, 2)).toEqual([
      "%ana'; DROP TABLE users;--%",
      "%ana'; DROP TABLE users;--%",
    ]);
  });

  it("papel e preferências viram parâmetros", async () => {
    const { svc, calls } = setup([]);

    await svc.execute("a1", UserRole.ADMIN, {
      role: "leader",
      loveLanguages: "toque",
    });

    const [sql, params] = calls()[0];
    expect(sql).toContain("u.role = ?");
    expect(sql).toContain("up.loveLanguages LIKE ?");
    expect(params).toEqual(["leader", "%toque%", 10, 0]);
  });

  it.each([
    [{ sortBy: "email", order: "DESC" as const }, "ORDER BY u.email DESC"],
    [{ sortBy: "birthDate" }, "ORDER BY pd.birthDate ASC"],
    [{}, "ORDER BY u.name ASC"],
  ])("ordenação %j gera %s", async (query, expected) => {
    const { svc, calls } = setup([]);
    await svc.execute("a1", UserRole.ADMIN, query);
    expect(calls()[0][0]).toContain(expected);
  });

  it("sortBy/order fora da lista nunca entram no SQL (mesmo sem o DTO)", async () => {
    const { svc, calls } = setup([]);

    await svc.execute("a1", UserRole.ADMIN, {
      sortBy: "name; DROP TABLE users;--",
      order: "ASC; DROP" as never,
    });

    const [sql] = calls()[0];
    expect(sql).toContain("ORDER BY u.name ASC");
    expect(sql).not.toContain("DROP");
  });
});

describe("GetAllProfilesService: paginação e montagem", () => {
  it("página 3 com limite 10 usa offset 20 e calcula os metadados", async () => {
    const { svc, calls } = setup([user("u1")], 45);

    const result = await svc.execute("a1", UserRole.ADMIN, {
      page: 3,
      limit: 10,
    });

    expect(calls()[0][1].slice(-2)).toEqual([10, 20]);
    expect(result.meta).toMatchObject({
      currentPage: 3,
      itemsPerPage: 10,
      totalItems: 45,
      totalPages: 5,
      hasNextPage: true,
      hasPreviousPage: true,
    });
  });

  it("monta o item com a data de nascimento em yyyy-mm-dd", async () => {
    const { svc } = setup([user("u1")]);

    const result = await svc.execute("a1", UserRole.ADMIN, {});

    expect(result.items[0]).toMatchObject({
      id: "u1",
      personalData: { birthDate: "1990-05-17", gender: "F" },
    });
    expect(result.items[0].image).toBeNull();
  });
});
