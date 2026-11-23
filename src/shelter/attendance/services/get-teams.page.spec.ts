import { GetTeamsService } from "./get-teams.service";
import { buildActor, buildTeam } from "../attendance.fixtures";

const repository = {
  findTeamsWithMembers: jest.fn(),
  findShelterPage: jest.fn(),
};
const scopeService = { resolve: jest.fn(), leaderTeamFilter: jest.fn() };

const svc = () =>
  new GetTeamsService(repository as never, scopeService as never);

beforeEach(() => {
  jest.resetAllMocks();
  scopeService.resolve.mockResolvedValue({ isAdmin: true, leaderTeamIds: [] });
  scopeService.leaderTeamFilter.mockReturnValue(undefined);
});

describe("GetTeamsService.listLeaderTeamsWithMembers (filtros no banco)", () => {
  it("sem parâmetros usa o caminho legado (hierarquia completa, sem consulta paginada)", async () => {
    repository.findTeamsWithMembers.mockResolvedValue([buildTeam()]);
    const out = await svc().listLeaderTeamsWithMembers(buildActor(), {});
    expect(Array.isArray(out)).toBe(true);
    expect(repository.findShelterPage).not.toHaveBeenCalled();
  });

  it("com page devolve { data, meta } e repassa o escopo do líder ao banco", async () => {
    scopeService.leaderTeamFilter.mockReturnValue(["t1"]);
    repository.findShelterPage.mockResolvedValue({
      teams: [buildTeam()],
      total: 30,
    });
    const out = (await svc().listLeaderTeamsWithMembers(buildActor(), {
      page: 2,
      limit: 12,
      search: "x",
    })) as unknown as { data: unknown[]; meta: Record<string, unknown> };
    expect(repository.findShelterPage).toHaveBeenCalledWith(
      ["t1"],
      expect.objectContaining({ search: "x", page: 2 }),
    );
    expect(out.data).toHaveLength(1);
    expect(out.meta).toMatchObject({
      page: 2,
      limit: 12,
      totalItems: 30,
      totalPages: 3,
    });
  });

  it("líder sem equipe: vazio sem consultar o banco", async () => {
    scopeService.leaderTeamFilter.mockReturnValue([]);
    const out = (await svc().listLeaderTeamsWithMembers(buildActor(), {
      page: 1,
    })) as unknown as { data: unknown[]; meta: { totalItems: number } };
    expect(out.data).toEqual([]);
    expect(out.meta.totalItems).toBe(0);
    expect(repository.findShelterPage).not.toHaveBeenCalled();
  });
});
