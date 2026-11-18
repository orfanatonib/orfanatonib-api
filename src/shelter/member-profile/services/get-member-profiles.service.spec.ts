import { ForbiddenException } from "@nestjs/common";

import { GetMemberProfilesService } from "./get-member-profiles.service";

function setup(role?: string, userId: string | null = "u1") {
  const repo = {
    findPageWithFilters: jest
      .fn()
      .mockResolvedValue({ items: [], total: 0, page: 1, limit: 10 }),
    listEntities: jest.fn().mockResolvedValue([]),
    findOneWithShelterAndLeaderOrFail: jest.fn(),
  };
  const auth = {
    tryGetPayload: jest
      .fn()
      .mockResolvedValue(role ? { role, sub: userId } : null),
  };
  const media = {
    findManyMediaItemsByTargets: jest.fn().mockResolvedValue([]),
  };
  return {
    repo,
    svc: new GetMemberProfilesService(
      repo as never,
      auth as never,
      media as never,
    ),
  };
}

const req = {} as never;

describe("GetMemberProfilesService: quem pode ler perfis de membro", () => {
  it.each([
    ["membro", "member"],
    ["sem sessão", undefined],
  ])("%s é negado antes de consultar o banco", async (_n, role) => {
    const { svc, repo } = setup(role);

    await expect(svc.findPage(req, {} as never)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    await expect(svc.list(req)).rejects.toBeInstanceOf(ForbiddenException);
    await expect(svc.findOne("m1", req)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(repo.findPageWithFilters).not.toHaveBeenCalled();
    expect(repo.listEntities).not.toHaveBeenCalled();
    expect(repo.findOneWithShelterAndLeaderOrFail).not.toHaveBeenCalled();
  });

  it("líder: o repositório recebe o contexto (papel e usuário) para filtrar por equipe", async () => {
    const { svc, repo } = setup("leader", "lider-1");

    await svc.findPage(req, { page: 1 } as never);
    await svc.list(req);

    const ctx = { role: "leader", userId: "lider-1" };
    expect(repo.findPageWithFilters).toHaveBeenCalledWith(
      expect.anything(),
      ctx,
    );
    expect(repo.listEntities).toHaveBeenCalledWith(ctx);
  });

  it("admin lê a página e a lista", async () => {
    const { svc, repo } = setup("admin", "a1");

    await expect(svc.findPage(req, {} as never)).resolves.toMatchObject({
      total: 0,
    });
    await expect(svc.list(req)).resolves.toEqual([]);
    expect(repo.findPageWithFilters).toHaveBeenCalledTimes(1);
  });
});
