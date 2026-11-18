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
