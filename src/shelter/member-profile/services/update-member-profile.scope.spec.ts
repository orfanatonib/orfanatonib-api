import { ForbiddenException } from "@nestjs/common";

import { UpdateMemberProfileService } from "./update-member-profile.service";

type Team = {
  id: string;
  numberTeam: number;
  members: Array<{ id: string }>;
};

function setup(
  role: string | undefined,
  led: string[],
  options: {
    teams?: Team[];
    memberTeam?: { id: string } | null;
    notifyFails?: boolean;
  } = {},
) {
  const { teams = [], memberTeam = null, notifyFails = false } = options;
  const repo = {
    findOneWithShelterAndLeaderOrFail: jest
      .fn()
      .mockResolvedValue({ id: "m1", team: memberTeam }),
  };
  const auth = {
    tryGetPayload: jest
      .fn()
      .mockResolvedValue(role ? { role, sub: "u1" } : null),
  };
  const getMember = {
    findOne: jest.fn().mockResolvedValue({
      id: "m1",
      user: { email: "m@x.test", name: "Maria" },
      shelter: { name: "Abrigo", team: { numberTeam: 1 } },
    }),
  };
  const getTeams = {
    findLedShelterIds: jest.fn().mockResolvedValue(new Set(led)),
    findByShelter: jest.fn().mockResolvedValue(teams),
    findOne: jest.fn((id: string) =>
      Promise.resolve(teams.find((t) => t.id === id) ?? null),
    ),
  };
  const createTeam = {
    execute: jest.fn().mockResolvedValue({ id: "novo", members: [] }),
  };
  const updateTeam = { execute: jest.fn().mockResolvedValue(undefined) };
  const notification = {
    sendTeamAssignmentChanged: notifyFails
      ? jest.fn().mockRejectedValue(new Error("smtp fora"))
      : jest.fn().mockResolvedValue(undefined),
  };
  const svc = new UpdateMemberProfileService(
    repo as never,
    auth as never,
    getMember as never,
    getTeams as never,
    createTeam as never,
    updateTeam as never,
    notification as never,
  );
  return { svc, repo, createTeam, updateTeam, notification };
}

const dto = { shelterId: "s1", numberTeam: 2 };
const req = {} as never;

describe("manageTeam: escopo de quem aloca o membro", () => {
  it.each([
    ["membro", "member"],
    ["sem papel", undefined],
  ])(
    "%s é negado antes de consultar ou alterar qualquer coisa",
    async (_n, role) => {
      const { svc, repo, createTeam, updateTeam } = setup(role, ["s1"]);
      await expect(svc.manageTeam("m1", dto, req)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
      expect(repo.findOneWithShelterAndLeaderOrFail).not.toHaveBeenCalled();
      expect(createTeam.execute).not.toHaveBeenCalled();
      expect(updateTeam.execute).not.toHaveBeenCalled();
    },
  );

  it("líder aloca em abrigo que lidera", async () => {
    const { svc, createTeam } = setup("leader", ["s1"]);
    await svc.manageTeam("m1", dto, req);
    expect(createTeam.execute).toHaveBeenCalledTimes(1);
  });

  it("líder NÃO aloca em abrigo que não lidera: 403 e nenhuma equipe é tocada", async () => {
    const { svc, createTeam, updateTeam } = setup("leader", ["outro"]);
    await expect(svc.manageTeam("m1", dto, req)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(createTeam.execute).not.toHaveBeenCalled();
    expect(updateTeam.execute).not.toHaveBeenCalled();
  });

  it("admin aloca em qualquer abrigo sem consultar liderança", async () => {
    const { svc, createTeam } = setup("admin", []);
    await svc.manageTeam("m1", dto, req);
    expect(createTeam.execute).toHaveBeenCalledTimes(1);
  });
});

describe("manageTeam: criação e troca de equipe", () => {
  it("equipe inexistente no abrigo: cria já com o membro dentro", async () => {
    const { svc, createTeam, updateTeam } = setup("admin", []);
    await svc.manageTeam("m1", dto, req);
    expect(createTeam.execute).toHaveBeenCalledWith({
      numberTeam: 2,
      shelterId: "s1",
      memberProfileIds: ["m1"],
    });
    expect(updateTeam.execute).not.toHaveBeenCalled();
  });

  it("troca de equipe: tira da atual e põe na de destino, preservando os outros integrantes", async () => {
    const current: Team = {
      id: "t1",
      numberTeam: 1,
      members: [{ id: "m1" }, { id: "x" }],
    };
    const target: Team = { id: "t2", numberTeam: 2, members: [{ id: "y" }] };
    const { svc, updateTeam } = setup("admin", [], {
      teams: [current, target],
      memberTeam: { id: "t1" },
    });

    await svc.manageTeam("m1", dto, req);

    expect(updateTeam.execute).toHaveBeenNthCalledWith(1, "t1", {
      memberProfileIds: ["x"],
    });
    expect(updateTeam.execute).toHaveBeenNthCalledWith(2, "t2", {
      memberProfileIds: ["y", "m1"],
    });
  });

  it("já está na equipe de destino: nada é regravado", async () => {
    const target: Team = { id: "t2", numberTeam: 2, members: [{ id: "m1" }] };
    const { svc, updateTeam } = setup("admin", [], {
      teams: [target],
      memberTeam: { id: "t2" },
    });
    await svc.manageTeam("m1", dto, req);
    expect(updateTeam.execute).not.toHaveBeenCalled();
  });

  it("falha ao avisar por e-mail não desfaz o vínculo já gravado", async () => {
    const { svc, notification } = setup("admin", [], { notifyFails: true });
    await expect(svc.manageTeam("m1", dto, req)).resolves.toMatchObject({
      id: "m1",
    });
    expect(notification.sendTeamAssignmentChanged).toHaveBeenCalledTimes(1);
  });
});
