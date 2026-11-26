import { ForbiddenException, NotFoundException } from "@nestjs/common";

import { GetLeaderProfilesService } from "./get-leader-profiles.service";

function setup(role?: string, userId: string | null = "u1") {
  const repo = {
    findPageWithFilters: jest
      .fn()
      .mockResolvedValue({ items: [], total: 0, page: 1, limit: 10 }),
    listEntities: jest.fn().mockResolvedValue([]),
    findOneWithSheltersAndMembersOrFail: jest.fn(),
    findByUserId: jest.fn().mockResolvedValue({ id: "lp1" }),
    findSheltersByIds: jest.fn().mockResolvedValue([]),
  };
  const auth = {
    tryGetPayload: jest
      .fn()
      .mockResolvedValue(role ? { role, sub: userId } : null),
  };
  const shelters = { findShelterIdsForLeader: jest.fn().mockResolvedValue([]) };
  const media = {
    findManyMediaItemsByTargets: jest.fn().mockResolvedValue([]),
  };
  return {
    repo,
    shelters,
    svc: new GetLeaderProfilesService(
      repo as never,
      auth as never,
      shelters as never,
      media as never,
    ),
  };
}

const req = {} as never;

describe("GetLeaderProfilesService: quem pode ler perfis de líder", () => {
  it.each([
    ["membro", "member"],
    ["sem sessão", undefined],
  ])("%s é negado antes de consultar o banco", async (_n, role) => {
    const { svc, repo } = setup(role);

    await expect(svc.findPage(req, {} as never)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    await expect(svc.list(req)).rejects.toBeInstanceOf(ForbiddenException);
    await expect(svc.findOne("l1", req)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(repo.findPageWithFilters).not.toHaveBeenCalled();
    expect(repo.listEntities).not.toHaveBeenCalled();
    expect(repo.findOneWithSheltersAndMembersOrFail).not.toHaveBeenCalled();
  });

  it.each(["admin", "leader"])("%s lê a página e a lista", async (role) => {
    const { svc, repo } = setup(role);

    await expect(svc.findPage(req, {} as never)).resolves.toMatchObject({
      items: [],
      total: 0,
    });
    await expect(svc.list(req)).resolves.toEqual([]);
    expect(repo.findPageWithFilters).toHaveBeenCalledTimes(1);
  });
});

describe("GetLeaderProfilesService.findMyShelters", () => {
  it.each([
    ["admin", "admin"],
    ["membro", "member"],
    ["sem sessão", undefined],
  ])("%s não acessa (só líder)", async (_n, role) => {
    const { svc, repo } = setup(role);
    await expect(svc.findMyShelters(req)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(repo.findByUserId).not.toHaveBeenCalled();
  });

  it("líder sem perfil de líder: 404", async () => {
    const { svc, repo } = setup("leader");
    repo.findByUserId.mockResolvedValue(null);
    await expect(svc.findMyShelters(req)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it("líder sem abrigos: lista vazia e nenhuma consulta de abrigos", async () => {
    const { svc, repo } = setup("leader");
    await expect(svc.findMyShelters(req)).resolves.toEqual([]);
    expect(repo.findSheltersByIds).not.toHaveBeenCalled();
  });
});

describe("GetLeaderProfilesService: escopo de leitura do líder (e-mail e telefone)", () => {
  const leaderIn = (id: string, shelterId: string) => ({
    id,
    teams: [{ shelter: { id: shelterId } }],
    user: { id: "u-" + id, name: "N", email: "e@x.com", phone: "1" },
  });

  it("admin lê sem escopo de abrigo", async () => {
    const { svc, repo } = setup("admin");
    await svc.findPage(req, {} as never);
    expect(repo.findPageWithFilters).toHaveBeenCalledWith({}, undefined);
  });

  it("líder lê a página só dos abrigos que lidera", async () => {
    const { svc, repo, shelters } = setup("leader");
    shelters.findShelterIdsForLeader.mockResolvedValue(["s-own"]);
    await svc.findPage(req, {} as never);
    expect(repo.findPageWithFilters).toHaveBeenCalledWith({}, ["s-own"]);
  });

  it("líder sem abrigo não lê nenhum líder (escopo vazio)", async () => {
    const { svc, repo } = setup("leader");
    await svc.findPage(req, {} as never);
    expect(repo.findPageWithFilters).toHaveBeenCalledWith({}, []);
  });

  it("a lista simples do líder omite líderes de outros abrigos", async () => {
    const { svc, repo, shelters } = setup("leader");
    shelters.findShelterIdsForLeader.mockResolvedValue(["s-own"]);
    repo.listEntities.mockResolvedValue([
      leaderIn("a", "s-own"),
      leaderIn("b", "s-other"),
    ]);
    const out = await svc.list(req);
    expect(out.map((l) => l.leaderProfileId)).toEqual(["a"]);
  });

  it("líder de outro abrigo é 404 no findOne (sem revelar que existe)", async () => {
    const { svc, repo, shelters } = setup("leader");
    shelters.findShelterIdsForLeader.mockResolvedValue(["s-own"]);
    repo.findOneWithSheltersAndMembersOrFail.mockResolvedValue(
      leaderIn("b", "s-other"),
    );
    await expect(svc.findOne("b", req)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it("admin lê qualquer líder no findOne", async () => {
    const { svc, repo } = setup("admin");
    repo.findOneWithSheltersAndMembersOrFail.mockResolvedValue(
      leaderIn("b", "s-other"),
    );
    await expect(svc.findOne("b", req)).resolves.toMatchObject({ id: "b" });
  });
});
