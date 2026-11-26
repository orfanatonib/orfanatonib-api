import type { RouteEntity } from "../route-page.entity";
import { CleanupOrphanRoutesService } from "./cleanup-orphan-routes.service";

const route = (
  id: string,
  entityType: string,
  idToFetch: string,
): RouteEntity =>
  ({
    id,
    entityType,
    idToFetch,
    path: `p-${id}`,
    entityId: "e",
    title: "t",
  }) as RouteEntity;

function setup(
  routes: RouteEntity[],
  existingByType: Record<string, string[]>,
) {
  const routeRepo = {
    find: jest.fn().mockResolvedValue(routes),
    remove: jest.fn().mockResolvedValue(undefined),
  };
  const existence = {
    findExistingIds: jest.fn(
      (_target: unknown, ids: readonly string[]): Promise<Set<string>> => {
        const all = Object.values(existingByType).flat();
        return Promise.resolve(new Set(ids.filter((id) => all.includes(id))));
      },
    ),
  };
  return {
    routeRepo,
    existence,
    svc: new CleanupOrphanRoutesService(routeRepo as never, existence as never),
  };
}

describe("CleanupOrphanRoutesService", () => {
  const routes = [
    route("r1", "Event", "ev-ok"),
    route("r2", "Event", "ev-gone"),
    route("r3", "TipoDesconhecido", "x"),
    route("r4", "MeditationDay", "med-ok"),
  ];

  it("findOrphanRoutes lista a rota cuja entidade sumiu e a de tipo desconhecido, sem remover nada", async () => {
    const { svc, routeRepo } = setup(routes, {
      Event: ["ev-ok"],
      Meditation: ["med-ok"],
    });

    const result = await svc.findOrphanRoutes();

    expect(result.totalRoutes).toBe(4);
    expect(result.orphanRoutes.map((r) => r.id).sort()).toEqual(["r2", "r3"]);
    expect(routeRepo.remove).not.toHaveBeenCalled();
  });

  it("cleanupOrphanRoutes remove exatamente as órfãs e devolve os ids", async () => {
    const { svc, routeRepo } = setup(routes, {
      Event: ["ev-ok"],
      Meditation: ["med-ok"],
    });

    const result = await svc.cleanupOrphanRoutes();

    expect(result.orphanRoutes).toBe(2);
    expect(result.deletedRoutes.sort()).toEqual(["r2", "r3"]);
    expect(routeRepo.remove).toHaveBeenCalledTimes(2);
  });

  it("falha ao remover uma não impede as demais e é reportada", async () => {
    const { svc, routeRepo } = setup(routes, {
      Event: ["ev-ok"],
      Meditation: ["med-ok"],
    });
    routeRepo.remove
      .mockRejectedValueOnce(new Error("fk"))
      .mockResolvedValue(undefined);

    const result = await svc.cleanupOrphanRoutes();

    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].error).toBe("fk");
    expect(result.deletedRoutes).toHaveLength(1);
  });

  it("MeditationDay é validada pela meditação (idToFetch é o id da meditação)", async () => {
    const { svc, existence } = setup([route("r4", "MeditationDay", "med-ok")], {
      Meditation: ["med-ok"],
    });

    const result = await svc.findOrphanRoutes();

    expect(result.orphanRoutes).toHaveLength(0);
    expect(existence.findExistingIds).toHaveBeenCalledWith(expect.anything(), [
      "med-ok",
    ]);
  });

  it("consulta cada tipo uma vez, com ids únicos", async () => {
    const { svc, existence } = setup(
      [route("a", "Event", "same"), route("b", "Event", "same")],
      { Event: ["same"] },
    );

    await svc.findOrphanRoutes();

    expect(existence.findExistingIds).toHaveBeenCalledTimes(1);
    expect(existence.findExistingIds).toHaveBeenCalledWith(expect.anything(), [
      "same",
    ]);
  });

  it("sem rotas: nada a consultar", async () => {
    const { svc, existence } = setup([], {});
    await expect(svc.findOrphanRoutes()).resolves.toEqual({
      totalRoutes: 0,
      orphanRoutes: [],
    });
    expect(existence.findExistingIds).not.toHaveBeenCalled();
  });
});
