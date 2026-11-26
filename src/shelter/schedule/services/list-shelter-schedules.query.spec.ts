import { ListShelterSchedulesService } from "./list-shelter-schedules.service";

const entity = (id: string) =>
  ({
    id,
    visitNumber: 1,
    lessonContent: "L",
    team: { id: "t", numberTeam: 1, shelter: { id: "s", name: "Abrigo" } },
  }) as never;

const build = (role: string | undefined) => {
  const repo = {
    findAll: jest.fn().mockResolvedValue([entity("legacy")]),
    findFiltered: jest
      .fn()
      .mockResolvedValue({ items: [entity("a"), entity("b")], total: 25 }),
  };
  const auth = {
    tryGetPayload: jest
      .fn()
      .mockResolvedValue(role ? { role, sub: "u1" } : null),
  };
  const svc = new ListShelterSchedulesService(repo as never, auth as never);
  return { svc, repo, req: { query: {} } as never };
};

describe("ListShelterSchedulesService.executeQuery", () => {
  it("sem parâmetros novos devolve o array legado e não usa o filtro do banco", async () => {
    const { svc, repo, req } = build("admin");
    const out = (await svc.executeQuery(req, {})) as { id: string }[];
    expect(out.map((s) => s.id)).toEqual(["legacy"]);
    expect(repo.findFiltered).not.toHaveBeenCalled();
  });

  it("com page devolve { data, meta } com o total já filtrado", async () => {
    const { svc, repo, req } = build("admin");
    const out = (await svc.executeQuery(req, {
      page: 2,
      limit: 10,
      search: "x",
    })) as unknown as { data: unknown[]; meta: Record<string, unknown> };
    expect(repo.findFiltered).toHaveBeenCalledWith(
      { kind: "all" },
      expect.objectContaining({ search: "x", page: 2 }),
    );
    expect(out.data).toHaveLength(2);
    expect(out.meta).toMatchObject({
      page: 2,
      limit: 10,
      totalItems: 25,
      totalPages: 3,
    });
  });

  it("com filtro mas sem page devolve o array", async () => {
    const { svc, req } = build("admin");
    const out = await svc.executeQuery(req, { kind: "visit" as never });
    expect(Array.isArray(out)).toBe(true);
  });

  it.each([
    ["leader", { kind: "leader", userId: "u1" }],
    ["member", { kind: "member", userId: "u1" }],
    [undefined, { kind: "none" }],
  ])(
    "o papel %s vira o escopo %j antes de qualquer filtro",
    async (role, scope) => {
      const { svc, repo, req } = build(role);
      await svc.executeQuery(req, { page: 1 });
      expect(repo.findFiltered).toHaveBeenCalledWith(scope, expect.anything());
    },
  );
});
