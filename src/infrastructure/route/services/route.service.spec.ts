import { RouteEntity } from "../route-page.entity";
import { RouteService } from "./route.service";

const route = (id: string, isPublic: boolean) =>
  Object.assign(new RouteEntity(), { id, public: isPublic, path: `/${id}` });

function setup(meditation: unknown = { meditation: null }) {
  const repo = {
    find: jest
      .fn()
      .mockResolvedValue([route("pub", true), route("priv", false)]),
    findOne: jest.fn(),
  };
  const getMeditation = {
    getThisWeekMeditation: jest.fn().mockResolvedValue(meditation),
  };
  return {
    repo,
    getMeditation,
    svc: new RouteService(repo as never, getMeditation as never),
  };
}

describe("RouteService.findAllRoutes", () => {
  it("anônimo recebe só as públicas e nem consulta a meditação", async () => {
    const { svc, getMeditation } = setup();
    const out = await svc.findAllRoutes({ includeNonPublic: false });
    expect(out.map((r) => r.id)).toEqual(["pub"]);
    expect(getMeditation.getThisWeekMeditation).not.toHaveBeenCalled();
  });

  it("com sessão recebe todas (comportamento anterior), sem meditação", async () => {
    const { svc } = setup();
    expect((await svc.findAllRoutes()).map((r) => r.id)).toEqual([
      "pub",
      "priv",
    ]);
  });

  it("com sessão e meditação da semana: acrescenta os dias sintéticos não públicos", async () => {
    const { svc } = setup({
      meditation: {
        id: "m1",
        media: { url: "u" },
        days: [{ id: "d1", topic: "t", verse: "v", day: "monday" }],
      },
    });
    const out = await svc.findAllRoutes({ includeNonPublic: true });
    const day = out.find((r) => r.id === "d1");
    expect(day).toMatchObject({
      public: false,
      entityType: "MeditationDay",
      entityId: "m1",
      path: "monday",
    });
    expect(out).toHaveLength(3);
  });
});

describe("RouteService.findById", () => {
  it("anônimo não enxerga rota não pública (como se não existisse)", async () => {
    const { svc, repo } = setup();
    repo.findOne.mockResolvedValue(route("priv", false));
    expect(await svc.findById("priv", { includeNonPublic: false })).toBeNull();
    expect((await svc.findById("priv"))?.id).toBe("priv");
  });

  it("anônimo enxerga a pública; inexistente devolve null", async () => {
    const { svc, repo } = setup();
    repo.findOne
      .mockResolvedValueOnce(route("pub", true))
      .mockResolvedValueOnce(null);
    expect((await svc.findById("pub", { includeNonPublic: false }))?.id).toBe(
      "pub",
    );
    expect(await svc.findById("x", { includeNonPublic: false })).toBeNull();
  });
});
